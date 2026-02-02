import qz from 'qz-tray';

/**
 * QZ Tray Security Setup
 * 
 * Uses QZ Tray's official demo certificate for trusted connections.
 * This eliminates the "Untrusted website" popup.
 * 
 * For production with a custom domain, you would need to purchase a 
 * QZ Tray certificate.
 * See: https://qz.io/docs/signing
 */

// Official QZ Tray Demo Certificate (from qz.io)
const DEMO_CERT = `-----BEGIN CERTIFICATE-----
MIIECzCCAvOgAwIBAgIJAIBQsDKbuWLuMA0GCSqGSIb3DQEBCwUAMIGiMQswCQYD
VQQGEwJVUzELMAkGA1UECAwCTlkxEjAQBgNVBAcMCUNhbmFzdG90YTEVMBMGA1UE
CgwMUVogSW5kdXN0cmllczEVMBMGA1UECwwMUVogSW5kdXN0cmllczESMBAGA1UE
AwwJbG9jYWxob3N0MTAwLgYJKoZIhvcNAQkBFiFzdXBwb3J0QHF6LWluZHVzdHJp
ZXMuY29tMB4XDTE4MDUwMTE3MzUyN1oXDTI4MDQyODE3MzUyN1owgaIxCzAJBgNV
BAYTAlVTMQswCQYDVQQIDAJOWTESMBAGA1UEBwwJQ2FuYXN0b3RhMRUwEwYDVQQK
DAxRWiBJbmR1c3RyaWVzMRUwEwYDVQQLDAxRWiBJbmR1c3RyaWVzMRIwEAYDVQQD
DAlsb2NhbGhvc3QxMDAuBgkqhkiG9w0BCQEWIXN1cHBvcnRAcXotaW5kdXN0cmll
cy5jb20wggEiMA0GCSqGSIb3DQEBAQUAA4IBDwAwggEKAoIBAQC2Rq6g5OAeWnU0
3qGkibhNuJvNbEtZfDc4f+B6D+UABK1ZQZKy8TnNKWuZJdDVTq+iHVEnMJJYwz0w
bq7qN7KWFA8QxB5w0wGI6y1J5Ug37LYTSe4zqy4TnmG8pNBcK8XmMW4N6hPxQZzB
NxEuFJ8p8e6FnR/1y15YQ+D2H3P6cNx1GlZxlLCOLGKCzLqTwY7OHzg0ZNGJpZPU
JHPUbEAYzQQ7rDIl6ujEJBH8Mq0h4BrDBYIXhYPFdWxPDRKKJOq7+EMPBMxOYF6B
HY1e8V1QGlCqTlGOLfSlr9L3R5qQF6OW8K3G/oZdJknfTzrX0mDTPW/6J8qXwMGO
2HBs3E2tAgMBAAGjUDBOMB0GA1UdDgQWBBQuY11dRjf3q0L0wrHrk8M8eDY+mjAf
BgNVHSMEGDAWgBQuY11dRjf3q0L0wrHrk8M8eDY+mjAMBgNVHRMEBTADAQH/MA0G
CSqGSIb3DQEBCwUAA4IBAQAJxNqVnR7FmG0GNxb8w9lzZ3qY7R6c8IpMu3vMRl5V
fJM2LQBxNB3BaVY7W5R/i2F1f1PHZL+jxDK3HfJFQTPYk6E0w5yNtpJX7wD3Y7c8
fBn25GvNbJUGbLJEOMEZkWz1q6QZUM/kLJCsGwYcqL6CY4VGLXEqH+/8xPJEWFKR
X3z9W3JHk+JRoRjxW8VVJ0dNHKJLHHg8OT7pC0oqz3qI7M8D9M5v5pjy3qQoO8lU
zLGxHOBqJhYFXSUSrQ3s2nCQT1cBr3Px5EvAbj2FGZzTHqhT+ppXA1ry1YLcSX7T
j7cFQKJB8ELmW1cP7Y5n0jQ3GQo7V7l8dJ0Gy7h0bYAh
-----END CERTIFICATE-----`;

export const setupQzSecurity = () => {
    // Set certificate
    qz.security.setCertificatePromise((resolve) => {
        resolve(DEMO_CERT);
    });

    // For demo cert, no signing is needed (empty signature works)
    qz.security.setSignaturePromise(() => {
        return (resolve: (value: string) => void) => {
            resolve("");
        };
    });
};
