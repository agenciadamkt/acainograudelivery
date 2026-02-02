import qz from 'qz-tray';

/**
 * QZ Tray Security Setup
 * 
 * For development/localhost, we use anonymous mode (no signing).
 * QZ Tray will show a trust prompt the first time, but user can click
 * "Remember" to avoid seeing it again.
 * 
 * For production with a custom domain, you would need to purchase a 
 * QZ Tray certificate or generate a self-signed one.
 * See: https://qz.io/docs/signing
 */

export const setupQzSecurity = () => {
    // Option 1: Anonymous mode (no certificate, no signing)
    // This works for localhost/development but shows a trust prompt
    qz.security.setCertificatePromise((resolve) => {
        // Resolve with empty string to use anonymous/untrusted mode
        resolve("");
    });

    qz.security.setSignaturePromise(() => {
        return (resolve: (value: string) => void) => {
            // Return empty string for anonymous mode
            resolve("");
        };
    });
};

/**
 * Alternative: Setup with demo certificate (optional)
 * If you want to avoid trust prompts, you can use QZ's demo certificate.
 * Note: This only works in development; production requires a real cert.
 * 
 * To use demo cert, uncomment this function:
 */
/*
export const setupQzSecurityWithDemoCert = async () => {
    qz.security.setCertificatePromise((resolve, reject) => {
        fetch("https://qz.io/demo/assets/signing/demo.cert")
            .then(response => response.text())
            .then(resolve)
            .catch(reject);
    });

    qz.security.setSignaturePromise((toSign) => {
        return (resolve, reject) => {
            fetch("https://qz.io/demo/assets/signing/demo.key")
                .then(response => response.text())
                .then(privateKey => {
                    // Sign using jsrsasign
                    import('jsrsasign').then(({KEYUTIL, KJUR, stob64, hextorstr}) => {
                        const pk = KEYUTIL.getKey(privateKey);
                        const sig = new KJUR.crypto.Signature({"alg": "SHA512withRSA"});
                        sig.init(pk);
                        sig.updateString(toSign);
                        const hex = sig.sign();
                        resolve(stob64(hextorstr(hex)));
                    });
                })
                .catch(reject);
        };
    });
};
*/
