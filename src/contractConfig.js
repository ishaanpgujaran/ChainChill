export const CONTRACT_ADDRESS = "0xB5F2484a02A2Bfc2Cc4D38837F16d24c9D9F52ba";
export const CONTRACT_ABI = [
    [
        {
            "anonymous": false,
            "inputs": [
                {
                    "indexed": false,
                    "internalType": "string",
                    "name": "batchId",
                    "type": "string"
                },
                {
                    "indexed": true,
                    "internalType": "address",
                    "name": "manufacturer",
                    "type": "address"
                },
                {
                    "indexed": false,
                    "internalType": "string",
                    "name": "productName",
                    "type": "string"
                },
                {
                    "indexed": false,
                    "internalType": "uint256",
                    "name": "timestamp",
                    "type": "uint256"
                }
            ],
            "name": "BatchRegistered",
            "type": "event"
        },
        {
            "anonymous": false,
            "inputs": [
                {
                    "indexed": false,
                    "internalType": "string",
                    "name": "batchId",
                    "type": "string"
                },
                {
                    "indexed": true,
                    "internalType": "address",
                    "name": "handler",
                    "type": "address"
                },
                {
                    "indexed": false,
                    "internalType": "string",
                    "name": "handlerRole",
                    "type": "string"
                },
                {
                    "indexed": false,
                    "internalType": "int256",
                    "name": "temperature",
                    "type": "int256"
                },
                {
                    "indexed": false,
                    "internalType": "string",
                    "name": "location",
                    "type": "string"
                },
                {
                    "indexed": false,
                    "internalType": "uint256",
                    "name": "timestamp",
                    "type": "uint256"
                }
            ],
            "name": "CheckpointLogged",
            "type": "event"
        },
        {
            "inputs": [
                {
                    "internalType": "string",
                    "name": "_batchId",
                    "type": "string"
                },
                {
                    "internalType": "string",
                    "name": "_handlerName",
                    "type": "string"
                },
                {
                    "internalType": "string",
                    "name": "_handlerRole",
                    "type": "string"
                },
                {
                    "internalType": "int256",
                    "name": "_temperature",
                    "type": "int256"
                },
                {
                    "internalType": "string",
                    "name": "_location",
                    "type": "string"
                }
            ],
            "name": "logCheckpoint",
            "outputs": [],
            "stateMutability": "nonpayable",
            "type": "function"
        },
        {
            "inputs": [
                {
                    "internalType": "string",
                    "name": "_batchId",
                    "type": "string"
                },
                {
                    "internalType": "string",
                    "name": "_productName",
                    "type": "string"
                },
                {
                    "internalType": "string",
                    "name": "_productType",
                    "type": "string"
                },
                {
                    "internalType": "int256",
                    "name": "_minTemp",
                    "type": "int256"
                },
                {
                    "internalType": "int256",
                    "name": "_maxTemp",
                    "type": "int256"
                },
                {
                    "internalType": "uint256",
                    "name": "_expiryDate",
                    "type": "uint256"
                }
            ],
            "name": "registerBatch",
            "outputs": [],
            "stateMutability": "nonpayable",
            "type": "function"
        },
        {
            "anonymous": false,
            "inputs": [
                {
                    "indexed": false,
                    "internalType": "string",
                    "name": "batchId",
                    "type": "string"
                },
                {
                    "indexed": true,
                    "internalType": "address",
                    "name": "handler",
                    "type": "address"
                },
                {
                    "indexed": false,
                    "internalType": "int256",
                    "name": "violatingTemp",
                    "type": "int256"
                },
                {
                    "indexed": false,
                    "internalType": "int256",
                    "name": "allowedMin",
                    "type": "int256"
                },
                {
                    "indexed": false,
                    "internalType": "int256",
                    "name": "allowedMax",
                    "type": "int256"
                },
                {
                    "indexed": false,
                    "internalType": "uint256",
                    "name": "timestamp",
                    "type": "uint256"
                }
            ],
            "name": "TemperatureBreach",
            "type": "event"
        },
        {
            "inputs": [
                {
                    "internalType": "string",
                    "name": "_batchId",
                    "type": "string"
                }
            ],
            "name": "batchExists",
            "outputs": [
                {
                    "internalType": "bool",
                    "name": "",
                    "type": "bool"
                }
            ],
            "stateMutability": "view",
            "type": "function"
        },
        {
            "inputs": [],
            "name": "getAllBatchIds",
            "outputs": [
                {
                    "internalType": "string[]",
                    "name": "",
                    "type": "string[]"
                }
            ],
            "stateMutability": "view",
            "type": "function"
        },
        {
            "inputs": [
                {
                    "internalType": "string",
                    "name": "_batchId",
                    "type": "string"
                }
            ],
            "name": "getBatch",
            "outputs": [
                {
                    "internalType": "string",
                    "name": "productName",
                    "type": "string"
                },
                {
                    "internalType": "string",
                    "name": "productType",
                    "type": "string"
                },
                {
                    "internalType": "int256",
                    "name": "minTemp",
                    "type": "int256"
                },
                {
                    "internalType": "int256",
                    "name": "maxTemp",
                    "type": "int256"
                },
                {
                    "internalType": "uint256",
                    "name": "expiryDate",
                    "type": "uint256"
                },
                {
                    "internalType": "address",
                    "name": "manufacturer",
                    "type": "address"
                },
                {
                    "internalType": "bool",
                    "name": "isCompromised",
                    "type": "bool"
                },
                {
                    "internalType": "uint256",
                    "name": "createdAt",
                    "type": "uint256"
                }
            ],
            "stateMutability": "view",
            "type": "function"
        },
        {
            "inputs": [
                {
                    "internalType": "string",
                    "name": "_batchId",
                    "type": "string"
                }
            ],
            "name": "getCheckpoints",
            "outputs": [
                {
                    "components": [
                        {
                            "internalType": "string",
                            "name": "batchId",
                            "type": "string"
                        },
                        {
                            "internalType": "string",
                            "name": "handlerName",
                            "type": "string"
                        },
                        {
                            "internalType": "string",
                            "name": "handlerRole",
                            "type": "string"
                        },
                        {
                            "internalType": "int256",
                            "name": "temperature",
                            "type": "int256"
                        },
                        {
                            "internalType": "string",
                            "name": "location",
                            "type": "string"
                        },
                        {
                            "internalType": "address",
                            "name": "handlerAddress",
                            "type": "address"
                        },
                        {
                            "internalType": "uint256",
                            "name": "timestamp",
                            "type": "uint256"
                        },
                        {
                            "internalType": "bool",
                            "name": "isBreach",
                            "type": "bool"
                        }
                    ],
                    "internalType": "struct ColdChain.Checkpoint[]",
                    "name": "",
                    "type": "tuple[]"
                }
            ],
            "stateMutability": "view",
            "type": "function"
        },
        {
            "inputs": [
                {
                    "internalType": "string",
                    "name": "_batchId",
                    "type": "string"
                }
            ],
            "name": "isBatchSafe",
            "outputs": [
                {
                    "internalType": "bool",
                    "name": "",
                    "type": "bool"
                }
            ],
            "stateMutability": "view",
            "type": "function"
        }
    ]
];