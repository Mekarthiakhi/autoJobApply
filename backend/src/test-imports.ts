import cron from 'node-cron';
import { OpenAI } from 'openai';
import express from 'express';

console.log('cron:', typeof cron, cron ? typeof cron.schedule : 'null');
console.log('OpenAI:', typeof OpenAI);
console.log('express:', typeof express);
