import net from 'net';

const PROVIDER_CONFIGS = {
  'outlook.com': {
    domains: ['outlook.com', 'hotmail.com', 'live.com'],
    helo: 'outlook-com.olc.protection.outlook.com',
    timeout: 15000
  },
  'yahoo.com': {
    domains: ['yahoo.com', 'ymail.com', 'yahoo.co.uk'],
    helo: 'yahoo-smtp-in.l.yahoo.com',
    timeout: 12000
  },
  'icloud.com': {
    domains: ['icloud.com', 'me.com', 'mac.com'],
    helo: 'icloud-com.mail.protection.outlook.com',
    timeout: 10000
  }
};

export const getProviderConfig = (domain) => {
  for (const [provider, config] of Object.entries(PROVIDER_CONFIGS)) {
    if (config.domains.includes(domain.toLowerCase())) {
      return { ...config, provider };
    }
  }
  return null;
};

export const verifyProviderMailbox = async (mxServer, email, providerConfig) => {
  return new Promise((resolve) => {
    const socket = new net.Socket();
    let response = '';
    let isValid = false;
    
    const commands = [
      `HELO ${providerConfig.helo}\r\n`,
      `MAIL FROM:<verify@${providerConfig.helo}>\r\n`,
      `RCPT TO:<${email}>\r\n`,
      'QUIT\r\n'
    ];
    
    let currentCommand = 0;
    
    const handleResponse = (data) => {
      response += data.toString();
      if (response.includes('\r\n')) {
        const code = parseInt(response.substring(0, 3));
        
        switch (providerConfig.provider) {
          case 'outlook.com':
            // Outlook specific response codes
            if (code === 250 || code === 251) {
              isValid = true;
            }
            break;
            
          case 'yahoo.com':
            // Yahoo specific response codes
            if (code === 250 || code === 235) {
              isValid = true;
            }
            break;
            
          case 'icloud.com':
            // iCloud specific response codes
            if (code === 250 || code === 220) {
              isValid = true;
            }
            break;
            
          default:
            if (code >= 200 && code < 300) {
              isValid = true;
            }
        }

        if (code >= 200 && code < 300 || code === 451 || code === 452) {
          currentCommand++;
          if (currentCommand < commands.length) {
            socket.write(commands[currentCommand]);
          }
        } else if (code >= 500 || code === 450) {
          socket.destroy();
          resolve(false);
        }
        
        response = '';
      }
    };

    socket.connect(25, mxServer, () => {
      socket.write(commands[currentCommand]);
      
      socket.on('data', handleResponse);
      
      socket.on('error', () => {
        resolve(isValid);
      });
      
      socket.on('close', () => {
        resolve(isValid);
      });
    });
    
    socket.on('error', () => {
      resolve(false);
    });
    
    setTimeout(() => {
      socket.destroy();
      resolve(isValid);
    }, providerConfig.timeout);
  });
};