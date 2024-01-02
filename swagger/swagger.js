const swaggerUi = require('swagger-ui-express');
const swaggereJsdoc = require('swagger-jsdoc');

const options = {
  swaggerDefinition: {
    openapi: '3.0.0',
    info: {
      version: '1.0.0',
      title: 'FTP API',
      description:
        '파이널 프로젝트 REST API'
    },
    servers: [
      {
        url: 'http://localhost:8888'
      }
    ],
  },
  apis: ['./routes/*.js']
};
const specs = swaggereJsdoc(options)

module.exports = { swaggerUi, specs }