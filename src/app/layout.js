import './globals.css';
import AuthProvider from '@/components/AuthProvider';
import Navbar from '@/components/Navbar';
import ChatbotWidget from '@/components/ChatbotWidget';

export const metadata = {
  title: 'Bazario - Premium Shopping Assistant',
  description: 'AI-powered e-commerce platform with smart recommendations and personalized chat.',
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>
        <AuthProvider>
          <Navbar />
          <main className="main-content">
            {children}
          </main>
          <ChatbotWidget />
          <footer className="footer">
            <div className="container">
              <p>© 2026 Bazario — Premium AI Shopping Assistant. Built with Next.js & NLP.</p>
            </div>
          </footer>
        </AuthProvider>
      </body>
    </html>
  );
}
