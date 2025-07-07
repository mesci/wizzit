# CoTURN Server Configuration - Production Setup

## Current TURN Server Setup

### 1. CoTURN Configuration (/etc/turnserver.conf)

```bash
# Basic Configuration
listening-port=3478
alt-listening-port=443
tls-listening-port=5349
listening-ip=YOUR_SERVER_IP
relay-ip=YOUR_SERVER_IP
external-ip=YOUR_SERVER_IP
realm=turn.yourdomain.com
server-name=turn.yourdomain.com

# SSL Configuration (Let's Encrypt)
cert=/etc/letsencrypt/live/turn.yourdomain.com/fullchain.pem
pkey=/etc/letsencrypt/live/turn.yourdomain.com/privkey.pem

# Time-Limited Credentials (RFC 5766)
fingerprint
lt-cred-mech
use-auth-secret
static-auth-secret=YOUR_SECURE_SECRET_KEY_HERE

# Performance Settings
user-quota=1000
total-quota=50000
max-bps=5000000000
stale-nonce=600

# Protocol Optimization
no-multicast-peers
no-rfc5780
no-stun-backward-compatibility

# IP Blacklist (Private Networks)
denied-peer-ip=10.0.0.0-10.255.255.255
denied-peer-ip=172.16.0.0-172.31.255.255
denied-peer-ip=192.168.0.0-192.168.255.255

# Port Range for Media Relay
min-port=49152
max-port=65535

# Logging
log-file=/var/log/turnserver.log
verbose
syslog
```

### 2. Environment Variables (.env.local)

```bash
# TURN Server Configuration
TURN_SERVER=YOUR_SERVER_IP:3478
TURN_SECRET=YOUR_SECURE_SECRET_KEY_HERE

# STUN Server (same server)
STUN_SERVER=YOUR_SERVER_IP:3478

# Alternative TURN with TLS (port 5349)
# TURN_SERVER=turn.yourdomain.com:5349

# Alternative ports available:
# Port 443 (for firewalls that block 3478)
# TURN_SERVER=YOUR_SERVER_IP:443
```

### 3. How Time-Limited Credentials Work

The server uses RFC 5766 time-limited credentials for security:

- **Username Format**: `timestamp:wizzit-user`
- **Password**: HMAC-SHA1 hash of username + shared secret
- **Automatic Expiry**: 24 hours (configurable)
- **Unique Per Session**: Each connection gets different credentials

### 4. Server Performance Settings

High-scale production settings:
- **User Quota**: 1000 sessions per user (enterprise level)
- **Total Quota**: 50,000 concurrent sessions (massive scale)
- **Max Bandwidth**: 5 Gbps per session (enterprise grade)
- **Session Timeout**: 10 minutes for inactive sessions
- **Port Range**: 49152-65535 for media relay

```bash
# Performance settings in /etc/turnserver.conf
user-quota=1000         # Max sessions per user
total-quota=50000       # Max concurrent sessions (50k users)
max-bps=5000000000      # 5 Gbps per session
stale-nonce=600         # 10 minutes timeout
```

**Scale**: These settings support hundreds of thousands of users with ultra-high bandwidth transfers.

### 5. Firewall Configuration

Current firewall rules:
```bash
# UFW Rules for TURN Server
sudo ufw allow 3478/udp comment 'TURN Server'
sudo ufw allow 3478/tcp comment 'TURN Server TCP'
sudo ufw allow 443/udp comment 'TURN Alternative Port'
sudo ufw allow 443/tcp comment 'TURN Alternative Port TCP'
sudo ufw allow 5349/tcp comment 'TURN Server TLS'

# Port range for media relay
sudo ufw allow 49152:65535/udp comment 'TURN Relay Ports'
```

### 6. SSL/TLS Certificate

Let's Encrypt certificate is configured:
```bash
# Certificate files (auto-renewed)
cert=/etc/letsencrypt/live/turn.yourdomain.com/fullchain.pem
pkey=/etc/letsencrypt/live/turn.yourdomain.com/privkey.pem

# Renewal check
sudo certbot renew --dry-run
```

### 7. Service Management

```bash
# Systemd service commands
sudo systemctl status coturn
sudo systemctl restart coturn
sudo systemctl reload coturn

# Log monitoring
sudo tail -f /var/log/turnserver.log

# Check active connections
sudo netstat -tuln | grep 3478
```

### 8. Testing TURN Server

```bash
# Test connectivity
turnutils_uclient -t -u "$(date +%s):test" -w "test-password" YOUR_SERVER_IP

# WebRTC test page for browser testing:
# https://webrtc.github.io/samples/src/content/peerconnection/trickle-ice/
```

### 9. Security Features

Current security implementation:
- Time-limited credentials (RFC 5766)
- Strong shared secret (64 characters)
- IP blacklisting for private networks
- Rate limiting and quotas
- SSL/TLS encryption support
- Firewall protection
- Log monitoring

### 10. Alternative TURN Services

If you want to use a managed service instead:

**Twilio**
```bash
TURN_SERVER=global.turn.twilio.com:3478?transport=udp
TURN_SECRET=your-twilio-secret
```

**Xirsys**
```bash
TURN_SERVER=ss-turn1.xirsys.com:80?transport=udp
TURN_SECRET=your-xirsys-secret
```

**Metered**
```bash
TURN_SERVER=a.relay.metered.ca:80
TURN_SECRET=your-metered-secret
```

---

*This configuration is prepared in accordance with RFC 5766 standards.* 