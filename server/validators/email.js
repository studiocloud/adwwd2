import dns from 'dns';
import { promisify } from 'util';
import net from 'net';
import { getProviderConfig, verifyProviderMailbox } from './providers.js';

const resolveMx = promisify(dns.resolveMx);
const resolveTxt = promisify(dns.resolveTxt);

export const validateEmailFormat = (email) => {
  if (!email || typeof email !== 'string') {
    return false;
  }
  const emailRegex = /^[a-zA-Z0-9](?:[a-zA-Z0-9._%+-]{0,61}[a-zA-Z0-9])?@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z]{2,})+$/;
  return emailRegex.test(email);
};

export const verifyMailbox = async (mxServer, email) => {
  return new Promise((resolve) => {
    const socket = new net.Socket();
    let response = '';
    let isValid = false;
    
    const [, domain] = email.split('@');
    const verifyFrom = `verify@${domain}`;
    
    const commands = [
      `HELO ${domain}\r\n`,
      `MAIL FROM:<${verifyFrom}>\r\n`,
      `RCPT TO:<${email}>\r\n`,
      'QUIT\r\n'
    ];
    
    let currentCommand = 0;
    let receivedRcptResponse = false;
    
    const cleanup = () => {
      if (socket.writable) {
        try {
          socket.write('QUIT\r\n');
        } catch (e) {
          // Ignore write errors during cleanup
        }
      }
      socket.destroy();
    };
    
    socket.setTimeout(7000); // Reduced timeout for faster response
    
    socket.on('timeout', () => {
      cleanup();
      // For generic emails, timeout often means the server is protective
      // We'll consider it potentially valid if we got this far
      resolve(currentCommand > 1);
    });
    
    socket.on('data', (data) => {
      response += data.toString();
      if (response.includes('\r\n')) {
        const lines = response.split('\r\n');
        for (const line of lines) {
          const code = parseInt(line.substring(0, 3));
          if (!code) continue;
          
          // For generic emails, we're more lenient with response codes
          if (currentCommand === 2 && !receivedRcptResponse) {
            receivedRcptResponse = true;
            // Accept 250 (success), 251 (forwarding), and 252 (unverified but will try)
            if (code === 250 || code === 251 || code === 252) {
              isValid = true;
            } 
            // Temporary failures might mean server protection
            else if (code === 450 || code === 451 || code === 452) {
              isValid = true;
            }
            // Hard failures mean invalid
            else if (code >= 500 || code === 550 || code === 553) {
              isValid = false;
            }
          }
          
          // Handle other responses
          if (code >= 200 && code < 300 || code === 451 || code === 452) {
            if (currentCommand < commands.length) {
              try {
                socket.write(commands[currentCommand]);
                currentCommand++;
              } catch (e) {
                cleanup();
                resolve(false);
                return;
              }
            }
          }
          // Only treat permanent errors as definite failures
          else if (code >= 500) {
            cleanup();
            resolve(false);
            return;
          }
        }
        response = lines[lines.length - 1];
      }
    });
    
    socket.on('error', () => {
      cleanup();
      // For generic emails, connection errors often mean firewall/protection
      // Consider it potentially valid if we got past initial connection
      resolve(currentCommand > 0);
    });
    
    socket.on('close', () => {
      // For generic emails, consider it valid if we got a positive RCPT TO
      // response or made it past initial commands without permanent failure
      resolve(isValid || (currentCommand > 1 && !receivedRcptResponse));
    });
    
    socket.connect(25, mxServer, () => {
      socket.write(commands[currentCommand]);
      currentCommand++;
    });
  });
};

export const validateEmail = async (email) => {
  if (!validateEmailFormat(email)) {
    return {
      email,
      valid: false,
      checks: {
        mx: false,
        dns: false,
        spf: false,
        mailbox: false,
        smtp: false
      },
      reason: 'Invalid email format'
    };
  }

  const [, domain] = email.split('@');
  const result = {
    email,
    valid: false,
    checks: {
      mx: false,
      dns: false,
      spf: false,
      mailbox: false,
      smtp: false
    },
    reason: ''
  };

  try {
    // DNS Check
    try {
      await dns.promises.lookup(domain);
      result.checks.dns = true;
    } catch (error) {
      result.reason = 'Domain does not exist';
      return result;
    }

    // MX Check
    let mxRecords;
    try {
      mxRecords = await resolveMx(domain);
      result.checks.mx = mxRecords && mxRecords.length > 0;
      if (!result.checks.mx) {
        result.reason = 'No mail server found for domain';
        return result;
      }
    } catch (error) {
      result.reason = 'Failed to verify mail server';
      return result;
    }

    // SPF Check - More lenient for generic emails
    try {
      const txtRecords = await resolveTxt(domain);
      result.checks.spf = txtRecords.some(records => 
        records.some(record => record.includes('v=spf1'))
      );
      // Don't return early for generic domains without SPF
      if (!result.checks.spf && getProviderConfig(domain)) {
        result.reason = 'Domain lacks SPF record';
        return result;
      }
    } catch (error) {
      // Don't fail on SPF errors for generic domains
      if (getProviderConfig(domain)) {
        result.reason = 'Failed to verify SPF record';
        return result;
      }
      result.checks.spf = true;
    }

    // SMTP & Mailbox Check
    try {
      let mailboxExists = false;
      result.checks.smtp = false;
      
      // Check provider-specific validation first
      const providerConfig = getProviderConfig(domain);
      if (providerConfig) {
        for (const mx of mxRecords) {
          try {
            mailboxExists = await verifyProviderMailbox(mx.exchange, email, providerConfig);
            if (mailboxExists) {
              result.checks.smtp = true;
              result.checks.mailbox = true;
              break;
            }
          } catch (e) {
            continue;
          }
        }
      } else {
        // Generic SMTP verification with more lenient checks
        for (const mx of mxRecords) {
          try {
            mailboxExists = await verifyMailbox(mx.exchange, email);
            if (mailboxExists) {
              result.checks.smtp = true;
              result.checks.mailbox = true;
              break;
            }
          } catch (e) {
            continue;
          }
        }
      }
      
      if (!mailboxExists) {
        result.reason = 'Mailbox verification failed';
        // For generic emails, if we have DNS and MX, consider it potentially valid
        if (!providerConfig && result.checks.dns && result.checks.mx) {
          result.checks.smtp = true;
          result.checks.mailbox = true;
          result.reason = 'Email appears valid but could not fully verify';
        }
        return result;
      }
    } catch (error) {
      result.reason = 'Failed to verify mailbox';
      return result;
    }

    // All checks must pass for the email to be considered valid
    result.valid = Object.values(result.checks).every(check => check);
    
    if (result.valid) {
      result.reason = 'Email verified successfully';
    } else if (!result.reason) {
      result.reason = 'Failed to verify email';
    }

    return result;
  } catch (error) {
    console.error('Validation error:', error);
    result.reason = 'Validation failed';
    return result;
  }
};