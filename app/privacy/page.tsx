import type { Metadata } from 'next';
import { Navbar } from '@/components/layout/navbar';
import { Footer } from '@/components/layout/footer';

export const metadata: Metadata = {
  title: 'Privacy Policy',
  description: 'How Tramo collects, uses, shares, and protects your personal information and content.',
  alternates: { canonical: '/privacy' },
};

export default function PrivacyPolicyPage() {
  return <div className="min-h-screen">
    <Navbar />
    <main className="mx-auto max-w-[800px] px-6 pb-[84px] pt-16 md:px-[72px]">
      <h1 className="mb-6 font-display text-[clamp(36px,5vw,48px)] font-medium leading-tight">Privacy Policy</h1>
      <div className="mb-10 text-sm leading-6 text-muted-foreground">
        <p>Last updated: <time dateTime="2026-10-15">October 15, 2026</time></p>
        <p>Effective date: <time dateTime="2026-10-15">October 15, 2026</time></p>
      </div>
      <div className="space-y-10 text-base leading-7 text-muted-foreground">
        <section className="space-y-4">
          <h2 className="font-display text-2xl font-medium text-foreground">Who operates Tramo</h2>
          <p>Tramo is operated by <strong>Ezequiel Martino</strong>, an individual based in Argentina and responsible for the personal information described here. For questions or privacy requests, email <strong>contact@tramo.dev</strong>.</p>
        </section>
        <section className="space-y-4">
          <h2 className="font-display text-2xl font-medium text-foreground">Information we collect and why</h2>
          <p>We process your email, username, date of birth, authentication information, and any optional profile information you provide. Passwords are stored as hashes. If you sign in with Google, we receive information needed to identify and authenticate your Google account.</p>
          <p>We store your projects, trails, notes, images, settings, and related activity, such as comments, follows, votes, bookmarks, reports, and notifications. We use this information to operate Tramo, synchronize your work, apply sharing choices, and provide its features.</p>
          <p>We also process technical information, such as IP addresses, request metadata, security signals, and error reports, to protect and maintain the service. Support messages are used to respond to you. Cloudflare Web Analytics provides aggregate information about visits, page views, and website performance. Optional tracking requires consent where applicable; accepting the Terms does not replace that consent.</p>
          <p>Account and eligibility information is required for the corresponding features. Optional profile fields are voluntary. Without information needed for a feature, we may be unable to provide it.</p>
        </section>
        <section className="space-y-4">
          <h2 className="font-display text-2xl font-medium text-foreground">Private and shared content</h2>
          <p>Projects are private by default. Private notes are not publicly displayed, but they are not end-to-end encrypted: necessary processing by the operator and hosting providers can occur to operate, secure, support, or comply with legal obligations for the service.</p>
          <p>Unlisted projects can be accessed by anyone who obtains their link. Public projects can be viewed by others and may be indexed by search engines. Profile information and activity can be visible according to your settings; age may appear if age visibility is enabled. Review profile settings separately from project visibility.</p>
          <p>Sharing can allow others to read, fork, or export your work through available features. Making the original private or deleting it does not automatically remove independent forks, downloads, screenshots, or search-engine copies. Applicable privacy and other legal rights still apply.</p>
        </section>
        <section className="space-y-4">
          <h2 className="font-display text-2xl font-medium text-foreground">Providers and sharing</h2>
          <p>We use Hostinger for backend and database hosting, Vercel for frontend hosting, Cloudflare R2 for image storage, Cloudflare Web Analytics for website traffic and performance measurement, Resend for account emails, Google for sign-in and reCAPTCHA, Sentry for error monitoring, and Patreon for optional memberships and payments. These services receive information relevant to their functions and may also process information under their own policies. Google reCAPTCHA may process browser, device, and interaction data for abuse prevention; Google&apos;s <a href="https://policies.google.com/privacy" className="text-primary underline underline-offset-4">Privacy Policy</a> and <a href="https://policies.google.com/terms" className="text-primary underline underline-offset-4">Terms</a> apply.</p>
          <p>Cloudflare Web Analytics measures website traffic and performance rather than recording note contents. Sentry is used to diagnose errors and technical failures, not to record sessions or collect private note contents. See <a href="https://developers.cloudflare.com/web-analytics/about/" className="text-primary underline underline-offset-4">Cloudflare&apos;s Web Analytics documentation</a> and <a href="https://sentry.io/privacy/" className="text-primary underline underline-offset-4">Sentry&apos;s Privacy Policy</a>.</p>
          <p>When you connect Patreon, we receive account and membership information and authorization tokens needed to verify benefits. Patreon handles payment credentials; Tramo does not receive full card details through this integration.</p>
          <p>We do not sell your personal information. We may disclose information when legally required or reasonably necessary to prevent abuse, protect people, or address a rights complaint, subject to applicable law.</p>
          <p>Providers may process information outside Argentina. Where required, international transfers must use applicable adequacy decisions or other lawful safeguards. Contact us for information about the providers and safeguards used.</p>
        </section>
        <section className="space-y-4">
          <h2 className="font-display text-2xl font-medium text-foreground">Storage, retention, and deletion</h2>
          <p>Cookies, browser storage, and similar technologies may support authentication, preferences, security, and enabled analytics. Blocking necessary storage can prevent features from working. Optional tracking must follow applicable consent requirements; contact us about your choices.</p>
          <p>Account information and content are retained while needed to provide the service, unless you delete them or request deletion. Security, support, and legally required records may be retained only as necessary for their purposes. Backups and provider records may follow separate retention cycles; contact us for details.</p>
          <p>You can delete your account using the available controls or request deletion at <strong>contact@tramo.dev</strong>. Legal retention requirements may limit deletion of particular records. Independent forks and exports are addressed above. Deleting Tramo does not cancel a Patreon membership or delete Patreon&apos;s independent records.</p>
        </section>
        <section className="space-y-4">
          <h2 className="font-display text-2xl font-medium text-foreground">Your rights and security</h2>
          <p>You can request access, correction, updating, or deletion of your personal information at <strong>contact@tramo.dev</strong>. Other rights, including portability, objection, restriction, or withdrawal of consent, apply where provided by law. We may verify identity proportionately before acting.</p>
          <p>Argentina&apos;s Law No. 25,326 provides applicable access and correction/deletion rights. The <strong>Agencia de Acceso a la Información Pública (AAIP)</strong> receives complaints: <a href="https://www.argentina.gob.ar/aaip/datospersonales" className="text-primary underline underline-offset-4">argentina.gob.ar/aaip/datospersonales</a>.</p>
          <p>We use safeguards intended to protect your information, but no service can guarantee absolute security.</p>
        </section>
        <section className="space-y-4">
          <h2 className="font-display text-2xl font-medium text-foreground">Age requirements and changes</h2>
          <p>Tramo is not intended for children under 13. Higher age or parental-authorization requirements may apply where you live. Where legally required authorization cannot be obtained and verified, the service must not be used. Contact us if you believe an account does not meet these requirements.</p>
          <p>We may update this policy and will provide appropriate notice of material changes. New processing that requires consent will require that consent. Contact: <strong>contact@tramo.dev</strong>.</p>
        </section>
      </div>
    </main>
    <Footer />
  </div>;
}
