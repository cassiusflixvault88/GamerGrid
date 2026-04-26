import React from 'react';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import BackNavigation from '../components/BackNavigation';

const TermsOfServicePage = () => {
  const lastUpdated = 'February 25, 2026';
  return (
    <div className="min-h-screen bg-black text-white">
      <Navbar />
      <BackNavigation />
      <div className="container mx-auto px-4 py-12 max-w-4xl">
        <h1 className="text-4xl font-bold mb-2">Terms of Service</h1>
        <p className="text-white/50 text-sm mb-8">Last updated: {lastUpdated}</p>

        <section className="space-y-6 text-white/85 leading-relaxed">
          <div>
            <h2 className="text-2xl font-semibold text-yellow-400 mb-2">1. Acceptance</h2>
            <p>By accessing or using GamerGrid (gamer-grid.com), you agree to these Terms. If you don't agree, don't use the Service.</p>
          </div>

          <div>
            <h2 className="text-2xl font-semibold text-yellow-400 mb-2">2. Eligibility</h2>
            <p>You must be at least 13 years old to use GamerGrid. By creating an account, you represent that you meet this requirement.</p>
          </div>

          <div>
            <h2 className="text-2xl font-semibold text-yellow-400 mb-2">3. Account</h2>
            <p>You're responsible for keeping your password secure and for all activity on your account. Notify us immediately if you suspect unauthorized access.</p>
          </div>

          <div>
            <h2 className="text-2xl font-semibold text-yellow-400 mb-2">4. User Content</h2>
            <p>You retain ownership of reviews, comments, and replies you post. By posting, you grant GamerGrid a non-exclusive, royalty-free license to display, reproduce, and distribute your content within the Service.</p>
            <p className="mt-2"><strong>Prohibited content:</strong> spam, harassment, threats, hate speech, illegal content, sexually explicit material, or content that infringes third-party rights. We reserve the right to remove content that violates these terms and to suspend or ban accounts that repeatedly violate them.</p>
          </div>

          <div>
            <h2 className="text-2xl font-semibold text-yellow-400 mb-2">5. Pro Subscription</h2>
            <p>GamerGrid Pro is a recurring monthly subscription billed at $4.99/month via Stripe. You can cancel at any time from your account settings or by contacting us. Cancellations take effect at the end of the current billing period — no refunds for partial months.</p>
          </div>

          <div>
            <h2 className="text-2xl font-semibold text-yellow-400 mb-2">6. Game Data & Trademarks</h2>
            <p>Game titles, cover art, screenshots, trailers, and ratings are sourced from public APIs (IGDB, Steam, Twitch). All trademarks belong to their respective owners. GamerGrid is not affiliated with, endorsed by, or sponsored by any game publisher or platform.</p>
          </div>

          <div>
            <h2 className="text-2xl font-semibold text-yellow-400 mb-2">7. Service Availability</h2>
            <p>We strive for 99% uptime but make no guarantees. The Service is provided "as is" without warranties of any kind. We may modify, suspend, or discontinue features at any time.</p>
          </div>

          <div>
            <h2 className="text-2xl font-semibold text-yellow-400 mb-2">8. Limitation of Liability</h2>
            <p>To the maximum extent permitted by law, GamerGrid shall not be liable for any indirect, incidental, special, consequential, or punitive damages, or any loss of profits or data.</p>
          </div>

          <div>
            <h2 className="text-2xl font-semibold text-yellow-400 mb-2">9. Termination</h2>
            <p>We may suspend or terminate accounts that violate these Terms. You can close your account at any time by emailing us. Upon termination, your data is deleted within 30 days.</p>
          </div>

          <div>
            <h2 className="text-2xl font-semibold text-yellow-400 mb-2">10. Changes to Terms</h2>
            <p>We may update these Terms. Continued use after changes means you accept the new Terms.</p>
          </div>

          <div>
            <h2 className="text-2xl font-semibold text-yellow-400 mb-2">11. Governing Law</h2>
            <p>These Terms are governed by the laws of the United States and the state of residence of GamerGrid's founder.</p>
          </div>

          <div>
            <h2 className="text-2xl font-semibold text-yellow-400 mb-2">12. Contact</h2>
            <p>Questions? Email <a href="mailto:cassiusgamergrid@gmail.com" className="text-yellow-400 underline">cassiusgamergrid@gmail.com</a>.</p>
          </div>
        </section>
      </div>
      <Footer />
    </div>
  );
};

export default TermsOfServicePage;
