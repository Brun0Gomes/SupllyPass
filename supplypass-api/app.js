// Entrada de deploy reconhecida pela Vercel. O servidor SQLite usa server.js.
const express = require('express');
const { fromEnvironment } = require('./cloud/app');

if (typeof express !== 'function') throw new Error('Express indisponível.');
module.exports = fromEnvironment().app;
