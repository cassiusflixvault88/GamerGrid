import React from 'react';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import BackNavigation from '../components/BackNavigation';

const PrivacyPolicyPage = () => {
  const lastUpdated = 'February 25, 2026';
  return (
    <div className="min-h-screen bg-black text-white">
      <Navbar />
      <BackNavigation />
      <div className="container mx-auto px-4 py-12 max-w-4xl">
        <h1 className="text-4xl font-bold mb-2">Privacy Policy</h1>
        <p className="text-white/50 text-sm mb-8">Last updated: {lastUpdated}</p>

        <section className="prose prose-invert max-w-none space-y-6 text-white/85 leading-relaxed">
          <div>
            <h2 className="text-2xl font-semibold text-yellow-400 mb-2">1. Introduction</h2>
            <p>GamerGrid ("we", "us", or "our") operates gamer-grid.com (the "Service"). This page informs you of our policies regarding the collection, use, and disclosure of personal data when you use our Service.</p>
          </div>

          <div>
            <h2 className="text-2xl font-semibold text-yellow-400 mb-2">2. Information We Collect</h2>
            <p><strong>Account data:</strong> email, username, password (hashed), and optional profile information you provide.</p>
            <p><strong>Usage data:</strong> anonymous page views, referrer URL, device type, and session info to improve the Service. Your IP is hashed before storage.</p>
            <p><strong>Cookies:</strong> we use localStorage to keep you signed in and to remember preferences. We do not use third-party tracking cookies beyond those required by Google AdSense (see Section 6) and Stripe (payments).</p>
          </div>

          <div>
            <h2 className="text-2xl font-semibold text-yellow-400 mb-2">3. How We Use Your Data</h2>
            <ul className="list-disc list-inside space-y-1">
              <li>Provide, maintain, and improve the Service</li>
              <li>Send transactional emails (verification, password resets, weekly Top 10 digest if subscribed)</li>
              <li>Detect and prevent abuse, spam, and fraud</li>
              <li>Aggregate analytics for product decisions</li>
            </ul>
          </div>

          <div>
            <h2 className="text-2xl font-semibold text-yellow-400 mb-2">4. Data Sharing</h2>
            <p>We do <strong>not</strong> sell your personal data. We share data only with:</p>
            <ul className="list-disc list-inside space-y-1">
              <li><strong>Stripe</strong> – for processing Pro subscription payments</li>
              <li><strong>Resend</strong> – for sending transactional emails</li>
              <li><strong>IGDB / Twitch</strong> – for game metadata (no personal data sent)</li>
              <li><strong>Google AdSense</strong> – for serving non-personalized ads to free users (see Section 6)</li>
            </ul>
          </div>

          <div>
            <h2 className="text-2xl font-semibold text-yellow-400 mb-2">5. Your Rights</h2>
            <p>You can:</p>
            <ul className="list-disc list-inside space-y-1">
              <li>View and edit your profile in <em>Settings</em></li>
              <li>Change your email or password at any time</li>
              <li>Unsubscribe from the weekly digest in <em>Settings → Preferences</em></li>
              <li>Delete your account and all associated data by emailing <a href="mailto:cassiusgamergrid@gmail.com" className="text-yellow-400 underline">cassiusgamergrid@gmail.com</a></li>
            </ul>
          </div>

          <div>
            <h2 className="text-2xl font-semibold text-yellow-400 mb-2">6. Advertising (Google AdSense)</h2>
            <p>GamerGrid uses Google AdSense to display ads on the Service for users on the free tier. Google may use cookies to serve ads based on a user's prior visits to this site or other sites. You can opt out of personalized advertising by visiting <a href="https://www.google.com/settings/ads" target="_blank" rel="noopener noreferrer" className="text-yellow-400 underline">Google Ads Settings</a>.</p>
            <p>Pro subscribers see <strong>zero ads</strong> across the entire Service.</p>
          </div>

          <div>
            <h2 className="text-2xl font-semibold text-yellow-400 mb-2">7. Affiliate Disclosure</h2>
            <p>GamerGrid participates in the Amazon Services LLC Associates Program. Some links to game purchases on Amazon are affiliate links. If you purchase through these links, we earn a small commission at no extra cost to you. This helps fund the Service.</p>
          </div>

          <div>
            <h2 className="text-2xl font-semibold text-yellow-400 mb-2">8. Children's Privacy</h2>
            <p>The Service is not intended for users under 13. We do not knowingly collect data from children under 13.</p>
          </div>

          <div>
            <h2 className="text-2xl font-semibold text-yellow-400 mb-2">9. Changes to This Policy</h2>
            <p>We may update this policy. Changes will be posted on this page with the "Last updated" date.</p>
          </div>

          <div>
            <h2 className="text-2xl font-semibold text-yellow-400 mb-2">10. Contact</h2>
            <p>Questions? Email <a href="mailto:cassiusgamergrid@gmail.com" className="text-yellow-400 underline">cassiusgamergrid@gmail.com</a>.</p>
          </div>
        </section>
      </div>
      <Footer />
    </div>
  );
};

export default PrivacyPolicyPage;
