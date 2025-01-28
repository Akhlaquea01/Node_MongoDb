import swaggerJSDoc from 'swagger-jsdoc';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Read the JSON file synchronously
const swaggerDefinition = JSON.parse(
    fs.readFileSync(path.join(__dirname, '../swagger.json'), 'utf-8')
);

const swaggerConfig = swaggerJSDoc({
    swaggerDefinition,
    apis: [], // Add your API paths here
});

export { swaggerConfig };


/**
 * Code if we want swagger like Community routes file
 * import swaggerJSDoc from 'swagger-jsdoc';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const options = {
    swaggerDefinition: {
        info: {
            title: 'Your API',
            version: '1.0.0',
            description: 'API documentation using Swagger',
        },
    },
    apis: [path.join(__dirname, '../routes/*.js')],
};

const swaggerConfig = swaggerJSDoc(options);

export { swaggerConfig };

 */