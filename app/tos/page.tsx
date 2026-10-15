import type { Metadata } from 'next';
import { Navbar } from '@/components/layout/navbar';
import { Footer } from '@/components/layout/footer';

export const metadata: Metadata = {
  title: 'Terms of Service',
  description: 'Terms for using Tramo, sharing content, and managing your account and membership.',
  alternates: { canonical: '/tos' },
};

export default function TermsOfServicePage() {
  return <div className="min-h-screen">
    <Navbar />
    <main className="mx-auto max-w-[800px] px-6 pb-[84px] pt-16 md:px-[72px]">
      <h1 className="mb-6 font-display text-[clamp(36px,5vw,48px)] font-medium leading-tight">Terms of Service</h1>
      <div className="mb-10 text-sm leading-6 text-muted-foreground">
        <p>Last updated: <time dateTime="2026-10-15">October 15, 2026</time></p>
        <p>Effective date: <time dateTime="2026-10-15">October 15, 2026</time></p>
      </div>
      <div className="space-y-10 text-base leading-7 text-muted-foreground">
        <section className="space-y-4">
          <h2 className="font-display text-2xl font-medium text-foreground">Accounts and eligibility</h2>
          <p>Tramo is operated by <strong>Ezequiel Martino</strong>, based in Argentina. By creating an account and agreeing to these Terms, you agree to the rules below. Our Privacy Policy explains how we process personal information.</p>
          <p>You must be at least 13 and meet any higher age or authorization requirements applicable where you live. Where required, a parent or guardian must authorize your use through a legally adequate process. Provide accurate account information, protect your credentials, and contact <strong>contact@tramo.dev</strong> if you suspect unauthorized access.</p>
        </section>
        <section className="space-y-4">
          <h2 className="font-display text-2xl font-medium text-foreground">Your content</h2>
          <p>You own your content and must have permission to upload and share it. You grant Tramo a non-exclusive, worldwide, royalty-free permission to store, process, reproduce, and display it only as necessary to provide, secure, and support the service and follow your sharing choices. This does not transfer ownership or permit public display of private notes.</p>
          <p>Projects are private by default. Public projects can be viewed by others; unlisted links can be forwarded. When you enable sharing, forks, or exports, you permit the copies and adaptations needed for those features, for personal study and use within Tramo, including public forks where enabled. Users must preserve available attribution and respect third-party rights. This is not permission for unrelated commercial redistribution unless a separate license allows it.</p>
          <p>Existing authorized forks and exports may remain after the original is changed or deleted, subject to applicable privacy, copyright, and other rights. Keep independent copies of important work; Tramo is not a guaranteed archival service.</p>
        </section>
        <section className="space-y-4">
          <h2 className="font-display text-2xl font-medium text-foreground">Acceptable use and moderation</h2>
          <p>Do not post illegal or infringing material, unlawfully expose personal information, harass or exploit people, distribute malware, access accounts or private content without permission, spam, or bypass security, storage, or rate limits.</p>
          <p>We may remove content or restrict accounts when reasonably necessary to address violations, legal requirements, or security risks. Where appropriate and practicable, we will explain the action and allow an appeal. Send reports, security concerns, or appeals to <strong>contact@tramo.dev</strong>. For rights complaints, identify the material and explain your rights or authorization.</p>
        </section>
        <section className="space-y-4">
          <h2 className="font-display text-2xl font-medium text-foreground">Supporter and Patreon</h2>
          <p>Supporter memberships are purchased and managed through <strong>Patreon</strong>. Review the price, benefits, billing schedule, taxes, renewal conditions, and Patreon&apos;s terms before subscribing. Tramo uses your connected membership status to provide the advertised benefits.</p>
          <p><strong>Cancel renewal through Patreon. Deleting your Tramo account or disconnecting Patreon does not necessarily cancel billing.</strong> Contact us if benefits are missing or you need help.</p>
          <p>Refund requests follow the applicable Patreon or app-store process and any mandatory consumer rights. You can also contact <strong>contact@tramo.dev</strong>. Using Patreon does not remove our responsibilities for the benefits we offer.</p>
          <p>If Supporter benefits end, free-plan limits may apply and new storage-increasing actions may be restricted. Any proposed removal of existing content requires appropriate notice and compliance with law. Current benefits and limits are described in the service and membership offer.</p>
        </section>
        <section className="space-y-4">
          <h2 className="font-display text-2xl font-medium text-foreground">Availability, deletion, and changes</h2>
          <p>Features can change and interruptions can occur. We do not guarantee continuous availability or the accuracy of user content. Where permitted by law, Tramo is provided on an “as available” basis. Nothing here excludes mandatory consumer rights or liability that cannot legally be excluded.</p>
          <p>You may stop using Tramo, export available content, and delete your account. The Privacy Policy describes retention and shared-copy limitations. We may suspend access for material violations or significant legal or security risks, subject to applicable rights.</p>
          <p>We will provide appropriate notice of material changes to these Terms or paid benefits and obtain a new agreement where required. Changes apply prospectively and do not remove accrued rights.</p>
        </section>
        <section className="space-y-4">
          <h2 className="font-display text-2xl font-medium text-foreground">Governing law and contact</h2>
          <p>Argentine law governs these Terms, without removing mandatory protections available where you live. Disputes remain subject to competent courts and applicable consumer jurisdiction rules; no mandatory arbitration is imposed.</p>
          <p>Questions, support, and legal requests: <strong>contact@tramo.dev</strong>.</p>
        </section>
      </div>
    </main>
    <Footer />
  </div>;
}
