const admin = require('firebase-admin')
require('dotenv').config({ path: '../../config/config.env' })

// const serviceAccount = require('../../firebaseKey.json');

try {
  admin.initializeApp({
    credential: admin.credential.cert({
      type: 'service_account',
      project_id: 'sync-prd',
      private_key_id: 'a6a8cefd6ed4461e1829d1b505e6b3060e96fb59',
      private_key: '-----BEGIN PRIVATE KEY-----\nMIIEvwIBADANBgkqhkiG9w0BAQEFAASCBKkwggSlAgEAAoIBAQDKoVG5otEj4OiO\niiAg2soSfCx5utnHJC4AFo9IrEfXp5Lx6EPj8a8P/HF1YkWIEQ3X5u0upxZwi/qM\n+ziI3sBZ9KJDdNWeQzX4UL4DPeQwvnQCTA/3Sct/MttEWQirZ2KP9qfXcw5mpO56\nD4X3/Uvby+Ppvg6p6U1EK16aG/7k3vEJPW1UC667ovzE0cWQL0fliFT6Y1BrRZMN\nlV820YcRsE22zPQ93Wz6BYsHCtyme6Sfk1WFT+PdwMlXMMD7xsqGFAcW3OrvAaEL\n9P4tNr+Im0MNuMWLsu5oobsoqlxx/bJguJJkp82R5AuLrAzkXAD9U4Hf3lsbJ/JE\nSzu5mCOjAgMBAAECggEAWevwJCT8keL/4S2r51igv0ZKyHSiq4zDOzfHu1T1Bt9v\nRxovcqsw6LO7N//14lXLImpxDDiLLUP5WvIrmxXbH7CAB9aD7BlgjINsZ2ziZL1I\nJzLRDQk7HQYZJ0IppkMZitDHmEWPeP6tdA6KgcxvCyn2ySaWRFHr/5oNf+93lOIN\n0WGhMahV8Sfy7vhhTtVTqbHMpjjQ56HPoYUEkxE7lmMAyL2ApBu77yQKS9ccUTs1\nbehh65l4kwsKpQTaUVEcESzkV4vKxVxf9miG6rEOIaUAnNIfSoAgYNUA87EdE2DM\nTPCe2QNKLG/jHwr53b3dRx09AR1yUZElKhZc3hFOVQKBgQD7Ir4vIwl2xHJFStFw\nCjmDCVrW++8XzTDVFjytjgPOZ1JayqM6dGAn3yFwojTj2XSjaYmbSAL879kuG+/V\nUNUz/AQvdHMycXKcGDhKIa9nID//cQzifYKMLijyQAD7sTcvAIc2quFV4h8iam3X\niIUwpoq84jPmNEYmJ5Y2OXWwRQKBgQDOjg+2pciJYcpyczmn/ndH4roWXE7mBspk\nQDbqIAFYWs6f+hKJin9H577uiatsw1Ta0I8A9hLYaO7AjEu9brcKe/zKKuP7I8Ll\nm/YVDpi1lh9hVHXOEv7paeG4/h70uAJv8VVrJoM2XPhpfTm/GmWWBRqM0hc9X3E2\n8EFsCviGxwKBgQDg2DZWlZP/ldqJV3c0TLM5MsL2ABIMyVWTMpmY+bFGtxLw3sRN\nrav5hri100RvS142gGMHd+3U8BkOQ0zzO6/nHxfQNP5+hzwJrVWYaZhVSHaECX9z\nuNONFjbqzYsTzZKOrnZg55VgA1fExG0br8svx6wneI7m6J51wrOmUMOh0QKBgQCf\nMnC79jSEZiGRamuCpiaq+f0wpL6Onac58yAf/MDspzhfpm7JITyOX/gRg3vjHP12\nlI3TUNUfhGiXcMojW4SqCPvBmaMS+fIJ49WbTx+1vNm8u0r8pDliDyBQ41Nai8Qd\nISUTq6AvsyIms8RhHOg04wQeiwIsZDYvAKd7rUz1GwKBgQDIxE+wxYGIiSMbDXVp\nSOVBST0ctWYikz5i6YjCBqV/kTWj6EH6qRE2vQdugH/gY493Fgbiwe+6zskyN/fY\nxvsSO9oixuLH5/2G04avURsx76NZkKrPqAaD0KMW0v23roWZNSQZxFA4ygGRtXph\nP2whKjZW6Xrvb0/yTF/5RhdT1Q==\n-----END PRIVATE KEY-----\n',
      client_email: 'firebase-adminsdk-vt78l@sync-prd.iam.gserviceaccount.com',
      client_id: '108503165587706452960',
      auth_uri: 'https://accounts.google.com/o/oauth2/auth',
      token_uri: 'https://oauth2.googleapis.com/token',
      auth_provider_x509_cert_url: 'https://www.googleapis.com/oauth2/v1/certs',
      client_x509_cert_url: 'https://www.googleapis.com/robot/v1/metadata/x509/firebase-adminsdk-vt78l%40sync-prd.iam.gserviceaccount.com',
      universe_domain: 'googleapis.com'
    })
  })
} catch (error) {
  console.error('Firebase Admin initialization error:', error)
}

module.exports = admin
