import './globals.css';
import AuthProvider from '@/components/AuthProvider';
import Navbar from '@/components/Navbar';
import ChatbotWidget from '@/components/ChatbotWidget';

export const metadata = {
  title: 'ShopAI - AI-Powered Shopping Assistant',
  description: 'Discover products with our intelligent AI shopping assistant. Features NLP-based recommendations, sentiment-analyzed reviews, and a smart chatbot.',
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>
        <AuthProvider>
          <Navbar />
          <main>{children}</main>
          <ChatbotWidget />
          <footer className="footer">
            <div className="container">
              <p>© 2026 ShopAI — AI-Powered Shopping Assistant. Built with Next.js & NLP.</p>
            </div>
          </footer>
        </AuthProvider>
      </body>
    </html>
  );
}
