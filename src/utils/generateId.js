const { nanoid } = require('nanoid');

const generateRawId = () => `RAW-${nanoid(10)}`;
const generateBatchId = () => `BATCH-${nanoid(10)}`;
const generateMasterId = () => `MPID-${nanoid(10)}`;

module.exports = { generateRawId, generateBatchId, generateMasterId };
