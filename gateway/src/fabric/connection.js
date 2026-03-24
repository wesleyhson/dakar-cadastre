'use strict';
const { connect, signers } = require('@hyperledger/fabric-gateway');
const grpc = require('@grpc/grpc-js');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

const NETWORK_DIR = process.env.NETWORK_DIR || path.resolve(__dirname, '../../../network');
const PEER_ENDPOINT = process.env.PEER_ENDPOINT || 'localhost:7051';
const PEER_HOST_ALIAS = process.env.PEER_HOST_ALIAS || 'peer0.municipality.dakar.sn';
const CHANNEL_ID = process.env.CHANNEL_ID || 'dakar-cadastre';
const CHAINCODE_NAME = process.env.CHAINCODE_NAME || 'cadastre';

// ── TLS credentials for connecting to the gateway peer ────────────────────
function newGrpcConnection() {
  const tlsCertPath = path.join(
    NETWORK_DIR,
    'crypto-config/peerOrganizations/municipality.dakar.sn',
    'peers/peer0.municipality.dakar.sn/tls/ca.crt'
  );
  const tlsCert = fs.readFileSync(tlsCertPath);
  const credentials = grpc.credentials.createSsl(tlsCert);
  return new grpc.Client(PEER_ENDPOINT, credentials, {
    'grpc.ssl_target_name_override': PEER_HOST_ALIAS,
  });
}

// ── Identity for a given org user ─────────────────────────────────────────
function newIdentity(mspId, certDir) {
  const files = fs.readdirSync(certDir).filter(f => f.endsWith('.pem') || !f.includes('.'));
  const certFile = files.find(f => f.endsWith('-cert.pem') || !f.includes('.'));
  const cert = fs.readFileSync(path.join(certDir, certFile));
  return { mspId, credentials: cert };
}

function newSigner(keyDir) {
  const files = fs.readdirSync(keyDir);
  const privateKeyFile = path.join(keyDir, files[0]);
  const privateKeyPem = fs.readFileSync(privateKeyFile);
  const privateKey = crypto.createPrivateKey(privateKeyPem);
  return signers.newPrivateKeySigner(privateKey);
}

// ── Connection cache (one per org) ────────────────────────────────────────
const _connections = {};

function getOrgPaths(org) {
  const orgMap = {
    municipality: {
      mspId: 'MunicipalityMSP',
      domain: 'municipality.dakar.sn',
      user: 'Admin@municipality.dakar.sn',
    },
    revenue: {
      mspId: 'NationalRevenueMSP',
      domain: 'revenue.gouv.sn',
      user: 'Admin@revenue.gouv.sn',
    },
    observer: {
      mspId: 'CivilSocietyMSP',
      domain: 'observer.dakar.sn',
      user: 'Admin@observer.dakar.sn',
    },
  };
  return orgMap[org] || orgMap.municipality;
}

async function getContract(org = 'municipality') {
  if (_connections[org]) return _connections[org];

  const { mspId, domain, user } = getOrgPaths(org);
  const certDir = path.join(NETWORK_DIR, `crypto-config/peerOrganizations/${domain}/users/${user}/msp/signcerts`);
  const keyDir  = path.join(NETWORK_DIR, `crypto-config/peerOrganizations/${domain}/users/${user}/msp/keystore`);

  const client = newGrpcConnection();
  const gateway = connect({
    client,
    identity: newIdentity(mspId, certDir),
    signer: newSigner(keyDir),
    evaluateOptions: () => ({ deadline: Date.now() + 5000 }),
    endorseOptions:  () => ({ deadline: Date.now() + 15000 }),
    submitOptions:   () => ({ deadline: Date.now() + 5000 }),
    commitStatusOptions: () => ({ deadline: Date.now() + 60000 }),
  });

  const network  = gateway.getNetwork(CHANNEL_ID);
  const contract = network.getContract(CHAINCODE_NAME);

  _connections[org] = { gateway, contract };
  return _connections[org];
}

// ── Helper: evaluate (read) ────────────────────────────────────────────────
async function evaluate(fcn, args = [], org = 'observer') {
  const { contract } = await getContract(org);
  const result = await contract.evaluateTransaction(fcn, ...args);
  return JSON.parse(Buffer.from(result).toString('utf8'));
}

// ── Helper: submit (write) ─────────────────────────────────────────────────
async function submit(fcn, args = [], org = 'municipality') {
  const { contract } = await getContract(org);
  const result = await contract.submitTransaction(fcn, ...args);
  if (result.length === 0) return { ok: true };
  return JSON.parse(Buffer.from(result).toString('utf8'));
}

// ── Graceful shutdown ──────────────────────────────────────────────────────
function closeAll() {
  for (const { gateway } of Object.values(_connections)) {
    try { gateway.close(); } catch (_) {}
  }
}
process.on('SIGTERM', closeAll);
process.on('SIGINT', closeAll);

module.exports = { evaluate, submit };
