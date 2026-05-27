/**
 * Prisma client singleton — uses client generated in database package.
 */
const path = require('path');

let PrismaClient;
try {
  PrismaClient = require(path.join(
    __dirname,
    '../../../database/node_modules/.prisma/client'
  )).PrismaClient;
} catch {
  PrismaClient = require('@prisma/client').PrismaClient;
}

const prisma = new PrismaClient();

module.exports = prisma;
