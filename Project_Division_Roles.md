# AI Shopping Assistant - Team Project Division

This document outlines the distribution of work and responsibilities among the four team members for the development of the **AI-Powered Shopping Assistant** platform. The project was built using Next.js 14, MongoDB, and custom Vanilla JS for all AI/NLP modules to ensure a self-contained, zero-dependency AI architecture.

---

## 👨‍💻 Team Member 1: AI & Machine Learning Engineer
**Focus:** Natural Language Processing, Sentiment Analysis, and Recommendation Systems
**Key Responsibility:** Developing the core intelligence of the platform without relying on paid external APIs (like OpenAI).

**Major Contributions:**
*   **NLP Chatbot Engine (`lib/ai/chatbot.js`):** Built a rule-based NLP engine capable of intent classification across 14 different intents (e.g., searching products, adding to cart, checking order status, getting recommendations). Implemented entity extraction to handle dynamic user input.
*   **Sentiment Analysis Module (`lib/ai/sentiment.js`):** Engineered a custom lexicon-based sentiment analyzer. The algorithm processes text, handles negations (e.g., "not good") and intensifiers (e.g., "very bad"), and outputs a positive/negative/neutral score. Applied this to automatically tag and analyze all customer reviews.
*   **Recommendation Engine (`lib/ai/recommendations.js`):** Designed a hybrid recommendation system. It combines *Content-Based Filtering* (matching product categories, tags, and brands) with *Collaborative Filtering* (analyzing user purchase history) to deliver personalized product suggestions on the user dashboard.

---

## 👨‍💻 Team Member 2: Backend API & Database Architect
**Focus:** Server-side logic, Database Schema, Authentication, and Data Management
**Key Responsibility:** Designing a robust, secure, and scalable backend infrastructure.

**Major Contributions:**
*   **Database Design (`lib/models/`):** Architected the MongoDB schemas using Mongoose for `User`, `Product`, `Review`, `Order`, and `Chat`. Implemented advanced indexing (like text-search indexes on products) for high-performance querying.
*   **RESTful API Development (`src/app/api/`):** Developed over 12 secure API endpoints handling CRUD operations for products, cart management, order processing, and review submissions. 
*   **Authentication & Security (`api/auth/[...nextauth]`):** Integrated NextAuth.js for secure session management. Implemented JWT token strategies, password hashing with bcrypt, and role-based access control (differentiating between 'user' and 'admin').
*   **Data Seeding Pipeline (`api/seed`):** Created an automated ingestion script that pulled 194 real-world products from the DummyJSON API, processed them, ran initial sentiment analysis on mock reviews, and populated the MongoDB cluster.

---

## 👨‍💻 Team Member 3: Frontend Developer & UI/UX Designer
**Focus:** Client-side Interfaces, Responsive Design, and User Experience
**Key Responsibility:** Translating backend data into a premium, interactive, and seamless user interface.

**Major Contributions:**
*   **Global Design System (`src/app/globals.css`):** Built a custom dark-theme design system from scratch using CSS variables, glassmorphism, gradient text, and CSS animations. Ensured the application looks premium and modern.
*   **Core E-Commerce Pages (`src/app/`):** Developed the Home page (hero section, featured grids), the comprehensive Product Listing page (with dynamic search, filtering, and sorting), and the Shopping Cart/Checkout flow.
*   **Interactive Components (`src/components/`):** Created highly reusable client components, including the responsive `Navbar` (with real-time cart badge updates) and the floating `ChatbotWidget` that maintains chat history, displays quick replies, and triggers real-time events.
*   **Product Detail Engagement (`src/app/products/[id]`):** Built the complex product detail view, rendering dynamic specifications, image galleries, and a visual representation of sentiment analysis (using custom CSS bar charts).

---

## 👨‍💻 Team Member 4: Full Stack Integrator & Admin/Analytics Lead
**Focus:** Admin Dashboard, System Integration, Aggregation Pipelines, and Deployment
**Key Responsibility:** Providing business insights, managing the platform, and ensuring smooth end-to-end integration.

**Major Contributions:**
*   **Admin Dashboard (`src/app/admin/page.js`):** Developed a secure, role-protected admin interface. Built tabs for overseeing system statistics, managing user roles, tracking live orders, and viewing the entire product catalog.
*   **Data Aggregation (`api/admin/stats`):** Wrote complex MongoDB aggregation pipelines to generate real-time business intelligence for the admin dashboard. This includes calculating total revenue, visualizing category distributions, and aggregating platform-wide sentiment data.
*   **User Dashboard Integration (`src/app/dashboard/`):** Built the user-facing dashboard where customers can view their order history, personal profile, and the AI-generated recommendations provided by Member 1's engine.
*   **Deployment & Network Configuration:** Handled the tricky aspects of deployment. Diagnosed and fixed DNS SRV lookup issues for MongoDB Atlas connections and prepared the configuration (`next.config.mjs`, env variables) for seamless deployment to Vercel/Production.

---

### End-to-End Collaboration
While each member had a distinct focus area, the project required tight collaboration: Member 3's UI relied heavily on Member 2's API responses; Member 1's AI modules were integrated into the frontend by Member 3 and aggregated into statistics by Member 4. The result is a cohesive, highly functional, AI-driven application.
