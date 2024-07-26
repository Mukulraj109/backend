# ScribbleNest Backend

## Description

The backend for ScribbleNest is a Node.js application built with Express.js and MongoDB. It handles user authentication, blog management, comments, notifications, and more. The application uses Cloudinary for image uploads, Firebase Admin for Google authentication, and JWT for secure token-based authentication.

## Features

- User authentication with email/password and Google OAuth.
- CRUD operations for blogs.
- Commenting system with support for replies.
- Notification system for likes and comments.
- Search functionality for blogs and users.
- Trending blogs and recent activity tracking.

## Technologies

- **Node.js**: JavaScript runtime for server-side scripting.
- **Express.js**: Web application framework for Node.js.
- **MongoDB**: NoSQL database for storing user data, blogs, and comments.
- **Cloudinary**: Image upload and management service.
- **Firebase Admin SDK**: Google authentication.
- **JWT**: JSON Web Tokens for secure authentication.
- **Bcrypt**: Password hashing library.
- **Cors**: Middleware for enabling Cross-Origin Resource Sharing.

## Getting Started

### Prerequisites

- Node.js (>=14.0.0)
- MongoDB
- Cloudinary Account
- Firebase Project with Admin SDK

### Installation

1. **Clone the repository:**

   \`\`\`bash
   git clone https://github.com/Mukulraj109/frontend.git
   cd frontend
   \`\`\`

2. **Install dependencies:**

   \`\`\`bash
   npm install
   \`\`\`

3. **Create a \`.env\` file in the root directory and add the following environment variables:**

   \`\`\`env
   DB_LOCATION=mongodb://localhost:27017/scribblenest
   CLOUDINARY_CLOUD_NAME=your-cloud-name
   CLOUDINARY_API_KEY=your-api-key
   CLOUDINARY_API_SECRET=your-api-secret
   SECRET_ACCESS_KEY=your-secret-key
   \`\`\`

4. **Add Firebase service account credentials:**

   Place your Firebase Admin SDK JSON file in the root directory and name it \`serviceAccountKey.json\`.

5. **Start the server:**

   \`\`\`bash
   npm start
   \`\`\`

   The server will start on port \`3000\` by default. You can change the port in the \`app.js\` file.

## API Endpoints

### Authentication

- **POST /signup**
  - Registers a new user.
  - Requires \`fullname\`, \`email\`, and \`password\` in the request body.

- **POST /signin**
  - Authenticates a user.
  - Requires \`email\` and \`password\` in the request body.

- **POST /google-auth**
  - Authenticates a user using Google OAuth.
  - Requires \`access_token\` in the request body.

- **POST /change-password**
  - Changes the password for the authenticated user.
  - Requires \`currentPassword\` and \`newPassword\` in the request body.

### User Profile

- **POST /update-profile-img**
  - Updates the profile image for the authenticated user.
  - Requires \`url\` in the request body.

- **POST /update-profile**
  - Updates the user's profile information.
  - Requires \`username\`, \`bio\`, and \`social_links\` in the request body.

- **POST /search-users**
  - Searches for users by username.
  - Requires \`query\` in the request body.

- **POST /get-profile**
  - Gets the profile of a user by username.
  - Requires \`username\` in the request body.

### Blog Management

- **POST /create-blog**
  - Creates or updates a blog post.
  - Requires \`title\`, \`des\`, \`banner\`, \`draft\`, \`content\`, \`tags\`, and optionally \`id\` in the request body.

- **POST /latest-blogs**
  - Retrieves the latest blogs.
  - Requires \`page\` in the request body.

- **POST /search-blogs**
  - Searches for blogs by tag, query, or author.
  - Requires \`tag\`, \`query\`, \`author\`, \`page\`, \`limit\`, and optionally \`eliminate_blog\` in the request body.

- **POST /get-blog**
  - Retrieves a blog by ID.
  - Requires \`blog_id\`, \`draft\`, and \`mode\` in the request body.

- **POST /like-blog**
  - Likes or unlikes a blog post.
  - Requires \`_id\` and \`isLikedByUser\` in the request body.

- **POST /isLiked-by-user**
  - Checks if the blog is liked by the authenticated user.
  - Requires \`_id\` in the request body.

### Comments

- **POST /add-comment**
  - Adds a comment to a blog post.
  - Requires \`_id\`, \`comment\`, \`replying_to\`, \`blog_author\`, and optionally \`notification_id\` in the request body.

- **POST /get-blog-comments**
  - Retrieves comments for a blog post.
  - Requires \`blog_id\` and \`skip\` in the request body.

- **POST /get-replies**
  - Retrieves replies to a comment.
  - Requires \`_id\` and \`skip\` in the request body.

- **POST /delete-comment**
  - Deletes a comment.
  - Requires \`_id\` in the request body.

### Notifications

- **GET /new-notification**
  - Checks if there are new notifications for the authenticated user.

- **POST /notifications**
  - Retrieves notifications for the authenticated user.
  - Requires \`page\`, \`filter\`, and optionally \`deletedDocCount\` in the request body.

## Contributing

1. **Fork the repository.**
2. **Create a new branch:**

   \`\`\`bash
   git checkout -b feature/YourFeature
   \`\`\`

3. **Commit your changes:**

   \`\`\`bash
   git commit -am 'Add new feature'
   \`\`\`

4. **Push to the branch:**

   \`\`\`bash
   git push origin feature/YourFeature
   \`\`\`

5. **Create a new Pull Request.**

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Acknowledgments

- [Express.js](https://expressjs.com/)
- [MongoDB](https://www.mongodb.com/)
- [Cloudinary](https://cloudinary.com/)
- [Firebase](https://firebase.google.com/)
- [Bcrypt](https://github.com/kelektiv/node.bcrypt.js)
- [JWT](https://jwt.io/)
