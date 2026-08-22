export default function PrivacyPage() {
  return (
    <main className="max-w-3xl mx-auto px-6 py-12 text-gray-800">
      <h1 className="text-3xl font-bold mb-2">Politique de confidentialité</h1>
      <p className="text-sm text-gray-500 mb-8">Dernière mise à jour : août 2026</p>

      <section className="mb-8">
        <h2 className="text-xl font-semibold mb-3">1. Collecte des données</h2>
        <p>
          Mac Place (SARL ALCAS SOLUTIONS) collecte les informations personnelles que vous nous
          fournissez lors du dépôt de votre appareil en réparation, notamment : nom, prénom, adresse
          email, numéro de téléphone et adresse postale.
        </p>
      </section>

      <section className="mb-8">
        <h2 className="text-xl font-semibold mb-3">2. Notifications SMS</h2>
        <p className="mb-3">
          En fournissant votre numéro de téléphone, vous consentez à recevoir des notifications SMS
          transactionnelles de Mac Place concernant l&apos;avancement de votre réparation (statut,
          paiement, expédition). La fréquence des messages varie selon l&apos;avancement de votre
          dossier (généralement 2 à 5 messages par réparation).
        </p>
        <p className="mb-3">
          <strong>
            Les informations relatives aux numéros de téléphone mobiles et le consentement aux
            messages ne sont pas partagés avec des tiers ou des affiliés à des fins de marketing ou
            promotionnelles.
          </strong>
        </p>
        <p className="mb-3">
          Des frais de messages et de données peuvent s&apos;appliquer selon votre opérateur. Pour
          vous désinscrire, répondez <strong>STOP</strong> à tout moment. Pour obtenir de
          l&apos;aide, répondez <strong>HELP</strong>.
        </p>
      </section>

      <section className="mb-8">
        <h2 className="text-xl font-semibold mb-3">3. Utilisation des données</h2>
        <p>
          Vos données sont utilisées exclusivement pour la gestion de votre réparation, la
          communication sur l&apos;avancement de votre dossier et la facturation. Nous ne vendons ni
          ne partageons vos données personnelles avec des tiers à des fins commerciales.
        </p>
      </section>

      <section className="mb-8">
        <h2 className="text-xl font-semibold mb-3">4. Conservation des données</h2>
        <p>
          Vos données sont conservées pendant la durée nécessaire à la gestion de votre réparation
          et conformément aux obligations légales en vigueur.
        </p>
      </section>

      <section className="mb-8">
        <h2 className="text-xl font-semibold mb-3">5. Vos droits (RGPD)</h2>
        <p>
          Conformément au RGPD, vous disposez d&apos;un droit d&apos;accès, de rectification et de
          suppression de vos données. Pour exercer ces droits, contactez-nous à :{" "}
          <a href="mailto:lucas.macbroker@gmail.com" className="text-blue-600 underline">
            lucas.macbroker@gmail.com
          </a>
        </p>
      </section>

      <section className="mb-8">
        <h2 className="text-xl font-semibold mb-3">6. Contact</h2>
        <p>
          SARL ALCAS SOLUTIONS — Mac Place
          <br />
          39 rue Edouard Vaillant, 94140 Alfortville
          <br />
          <a href="mailto:lucas.macbroker@gmail.com" className="text-blue-600 underline">
            lucas.macbroker@gmail.com
          </a>
        </p>
      </section>
    </main>
  );
}
