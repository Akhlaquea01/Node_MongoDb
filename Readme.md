# Project Dependencies

## devDependencies
1. **nodemon** (^3.0.1): 
   - Nodemon is a development tool that monitors changes in your Node.js application and automatically restarts the server whenever changes are detected. It's commonly used during development to streamline the development process and eliminate the need for manual server restarts.
   
2. **prettier** (^3.0.3): 
   - Prettier is an opinionated code formatter that automatically formats your code according to predefined rules. It helps maintain consistent code style across your project and simplifies code formatting tasks.

## dependencies
1. **bcrypt** (^5.1.1): 
   - Bcrypt is a library used for hashing passwords in Node.js applications. It provides secure password hashing algorithms to safeguard user passwords stored in databases.

2. **cloudinary** (^1.41.0): 
   - Cloudinary is a cloud-based image and video management platform. It provides features for uploading, storing, manipulating, optimizing, and delivering images and videos in web applications.

3. **cookie-parser** (^1.4.6): 
   - Cookie-parser is a middleware for Express.js that parses cookies attached to the incoming HTTP requests. It extracts cookie data and makes it accessible in the request object, allowing developers to handle cookies in their Express.js applications.

4. **cors** (^2.8.5): 
   - CORS (Cross-Origin Resource Sharing) is a mechanism that allows web servers to specify which origins are permitted to access resources on a server. The CORS package for Node.js provides middleware for Express.js applications to enable CORS functionality and handle cross-origin requests securely.

5. **dotenv** (^16.3.1): 
   - Dotenv is a module that loads environment variables from a .env file into process.env. It helps manage environment-specific configuration variables in Node.js applications and keeps sensitive information like API keys and database credentials out of version control.
   Removed as it comes native with node v20.6.0

6. **express** (^4.18.2): 
   - Express.js is a popular web application framework for Node.js. It provides a robust set of features for building web servers and APIs, including routing, middleware support, request handling, and more.

7. **jsonwebtoken** (^9.0.2): 
   - JSON Web Token (JWT) is a compact, URL-safe means of representing claims to be transferred between two parties. The jsonwebtoken package allows Node.js applications to generate, sign, and verify JWTs for implementing authentication and authorization mechanisms.

8. **mongoose** (^8.0.0): 
   - Mongoose is an Object Data Modeling (ODM) library for MongoDB and Node.js. It provides a higher-level abstraction for interacting with MongoDB databases, including schema validation, querying, data manipulation, and more.

9. **mongoose-aggregate-paginate-v2** (^1.0.6): 
   - Mongoose Aggregate Paginate V2 is a plugin for Mongoose that adds pagination support to aggregation queries. It allows developers to paginate the results of MongoDB aggregation pipelines seamlessly.

10. **multer** (^1.4.5-lts.1): 
    - Multer is a middleware for handling multipart/form-data, which is primarily used for uploading files in web applications. It simplifies file uploads in Express.js applications by parsing and handling multipart/form-data requests.

11. **axios** (^1.6.8): 
    - Axios is a popular Promise-based HTTP client for making requests to servers. It works in both the browser and Node.js environments, providing a simple and intuitive API for performing HTTP requests. With Axios, you can easily make GET, POST, PUT, DELETE, and other types of HTTP requests, handle request and response interceptors, and manage request cancellation.


12. **nodemailer** (^6.9.13): 
    - Nodemailer is a module for Node.js applications that allows you to send emails easily. It supports Unicode, HTML content, attachments, and more. It can be used with various transport methods like SMTP, Sendmail, and Amazon SES.


13. **socket.io** (^4.7.5): 
    - Socket.IO is a JavaScript library that enables real-time, bidirectional communication between web clients and servers.Real-time Communication, Cross-platform Compatibility, WebSocket Support, Fallback Options, Event-Based Model, Room and Namespace Support, Error Handling, Scalability, Middleware Support, Authentication.


13. **swagger-jsdoc** (6.2.8): 
    - swagger-jsdoc is an npm package that simplifies the process of generating Swagger documentation for Node.js applications. It allows developers to document their APIs using JSDoc comments directly within their code. These comments are then parsed by swagger-jsdoc to generate a Swagger specification in JSON format. By integrating swagger-jsdoc into their development workflow, developers can maintain their API documentation alongside their codebase, ensuring consistency and accuracy..

13. **swagger-ui-express** (5.0.0): 
    - swagger-ui-express provides middleware for Express.js applications to serve Swagger UI.Swagger UI is a user-friendly interface that allows developers and consumers to interact with the API documentation. It provides features such as endpoint exploration, request and response examples, and API testing directly from the browser. 

14. **npm i leaflet** (1.9.4): 
   - Leaflet is the leading open-source JavaScript library for mobile-friendly interactive maps. Weighing just about 39 KB of gzipped JS plus 4 KB of gzipped CSS code, it has all the mapping features most developers ever need.