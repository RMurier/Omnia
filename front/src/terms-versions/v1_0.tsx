import React from "react";

interface Props {
  styles: Record<string, React.CSSProperties>;
}

export function V1_0_Fr({ styles }: Props) {
  return (
    <>
      <h1 style={styles.h1}>Conditions Générales d'Utilisation</h1>
      <p style={styles.version}>Version 1.0 — En vigueur depuis le 20 février 2026</p>

      <h2 style={styles.h2}>1. Éditeur du service</h2>
      <p style={styles.p}>
        Omnia est édité par <strong>Romain MURIER</strong>.<br />
        SIREN : 984 421 677 — SIRET : 984 421 677 00019<br />
        4 Lieu Dit Allonnes, 72610 Oisseau-le-Petit, France<br />
        Contact RGPD : <a style={styles.a} href="mailto:murierromain@gmail.com">murierromain@gmail.com</a>
      </p>

      <h2 style={styles.h2}>2. Hébergement</h2>
      <p style={styles.p}>
        Omnia est hébergé par <strong>OVH SAS</strong>, 2 rue Kellermann, 59100 Roubaix, France — au sein de l'Union Européenne.
      </p>

      <h2 style={styles.h2}>3. Objet du service</h2>
      <p style={styles.p}>
        Omnia est une plateforme de monitoring applicatif permettant la centralisation des logs, le suivi d'activité et la gestion d'applications. L'accès nécessite la création d'un compte utilisateur.
      </p>

      <h2 style={styles.h2}>4. Données personnelles collectées</h2>
      <p style={styles.p}>Dans le cadre de la création de votre compte, les données suivantes sont collectées :</p>
      <ul style={styles.ul}>
        <li style={styles.li}><strong>Adresse e-mail</strong> (obligatoire) — utilisée pour l'authentification et les communications liées au compte</li>
        <li style={styles.li}><strong>Prénom et nom</strong> (obligatoires) — aucune vérification d'identité n'est effectuée, un pseudonyme est accepté</li>
      </ul>
      <p style={styles.p}>Ces données sont <strong>chiffrées</strong>. Les mots de passe sont hachés via SHA-512 empêchant une personne tierce ou moi-même d'accéder à cette valeure.</p>

      <h2 style={styles.h2}>5. Finalité du traitement</h2>
      <p style={styles.p}>Vos données sont utilisées exclusivement pour :</p>
      <ul style={styles.ul}>
        <li style={styles.li}>La gestion de votre compte (authentification, confirmation d'e-mail, réinitialisation de mot de passe)</li>
        <li style={styles.li}>L'envoi d'e-mails transactionnels liés à votre compte (sécurité, confirmation)</li>
      </ul>
      <div style={styles.highlight}>
        <strong>Vos données ne sont ni vendues, ni cédées, ni partagées avec des tiers.</strong>
      </div>

      <h2 style={styles.h2}>6. Base légale (RGPD)</h2>
      <p style={styles.p}>
        Le traitement de vos données est fondé sur votre <strong>consentement explicite</strong> (article 6.1.a du RGPD), recueilli lors de la création de votre compte.
      </p>

      <h2 style={styles.h2}>7. Durée de conservation</h2>
      <p style={styles.p}>
        Vos données sont conservées pendant toute la durée d'activité de votre compte. En cas de suppression, l'ensemble de vos données personnelles est définitivement effacé.
      </p>

      <h2 style={styles.h2}>8. Vos droits (RGPD)</h2>
      <p style={styles.p}>Conformément au RGPD et à la loi Informatique et Libertés, vous disposez des droits suivants :</p>
      <ul style={styles.ul}>
        <li style={styles.li}><strong>Droit d'accès</strong> : obtenir une copie de vos données</li>
        <li style={styles.li}><strong>Droit de rectification</strong> : corriger vos informations</li>
        <li style={styles.li}><strong>Droit à l'effacement</strong> : supprimer votre compte et vos données</li>
        <li style={styles.li}><strong>Droit à la portabilité</strong> : recevoir vos données dans un format structuré</li>
      </ul>
      <p style={styles.p}>
        Pour exercer ces droits : <a style={styles.a} href="mailto:murierromain@gmail.com">murierromain@gmail.com</a><br />
        Vous pouvez également introduire une réclamation auprès de la <strong>CNIL</strong> :{" "}
        <a style={styles.a} href="https://www.cnil.fr" target="_blank" rel="noreferrer">www.cnil.fr</a>
      </p>

      <h2 style={styles.h2}>9. Cookies et traceurs</h2>
      <p style={styles.p}>
        Omnia n'utilise pas de cookies publicitaires ou de suivi comportemental. Un identifiant anonyme (UUID) est stocké localement sur votre appareil afin de comptabiliser les connexions uniques à des fins statistiques. Cet identifiant ne contient aucune donnée personnelle et n'est pas transmis à des tiers.
      </p>
      <p style={styles.p}>Des cookies strictement nécessaires au fonctionnement du service (authentification, session) peuvent également être utilisés.</p>

      <h2 style={styles.h2}>10. Sécurité</h2>
      <p style={styles.p}>
        L'ensemble des communications est sécurisé par HTTPS. Les données personnelles sont chiffrées. L'API est sécurisée par authentification.
      </p>

      <h2 style={styles.h2}>11. Modifications des CGU</h2>
      <p style={styles.p}>
        En cas de modification des présentes conditions, vous serez informé par e-mail. La poursuite de l'utilisation du service vaut acceptation des nouvelles conditions.
      </p>

      <h2 style={styles.h2}>12. Droit applicable</h2>
      <p style={styles.p}>
        Les présentes CGU sont soumises au droit français. En cas de litige, les tribunaux compétents sont ceux du ressort de l'adresse de l'éditeur.
      </p>
    </>
  );
}

export function V1_0_En({ styles }: Props) {
  return (
    <>
      <h1 style={styles.h1}>Terms of Service</h1>
      <p style={styles.version}>Version 1.0 — Effective February 20, 2026</p>

      <h2 style={styles.h2}>1. Publisher</h2>
      <p style={styles.p}>
        Omnia is published by <strong>Romain MURIER</strong>.<br />
        SIREN: 984 421 677 — SIRET: 984 421 677 00019<br />
        4 Lieu Dit Allonnes, 72610 Oisseau-le-Petit, France<br />
        GDPR contact: <a style={styles.a} href="mailto:murierromain@gmail.com">murierromain@gmail.com</a>
      </p>

      <h2 style={styles.h2}>2. Hosting</h2>
      <p style={styles.p}>
        Omnia is hosted by <strong>OVH SAS</strong>, 2 rue Kellermann, 59100 Roubaix, France — within the European Union.
      </p>

      <h2 style={styles.h2}>3. Service description</h2>
      <p style={styles.p}>
        Omnia is an application monitoring platform providing centralized logging, activity tracking, and application management. Access requires creating a user account.
      </p>

      <h2 style={styles.h2}>4. Personal data collected</h2>
      <p style={styles.p}>When creating your account, the following data is collected:</p>
      <ul style={styles.ul}>
        <li style={styles.li}><strong>Email address</strong> (required) — used for authentication and account-related communications</li>
        <li style={styles.li}><strong>First name and last name</strong> (required) — no identity verification is performed, a pseudonym is accepted</li>
      </ul>
      <p style={styles.p}>This data is <strong>encrypted</strong>. Passwords are hashed via SHA-512, preventing any third party or myself from accessing their value.</p>

      <h2 style={styles.h2}>5. Purpose of processing</h2>
      <p style={styles.p}>Your data is used exclusively for:</p>
      <ul style={styles.ul}>
        <li style={styles.li}>Account management (authentication, email confirmation, password reset)</li>
        <li style={styles.li}>Sending transactional emails related to your account (security, confirmation)</li>
      </ul>
      <div style={styles.highlight}>
        <strong>Your data is never sold, transferred, or shared with third parties.</strong>
      </div>

      <h2 style={styles.h2}>6. Legal basis (GDPR)</h2>
      <p style={styles.p}>
        The processing of your data is based on your <strong>explicit consent</strong> (GDPR Article 6.1.a), collected when creating your account.
      </p>

      <h2 style={styles.h2}>7. Data retention</h2>
      <p style={styles.p}>
        Your data is retained for the duration of your account. Upon account deletion, all your personal data is permanently erased.
      </p>

      <h2 style={styles.h2}>8. Your rights (GDPR)</h2>
      <p style={styles.p}>In accordance with the GDPR and the French Data Protection Act, you have the following rights:</p>
      <ul style={styles.ul}>
        <li style={styles.li}><strong>Right of access</strong>: obtain a copy of your data</li>
        <li style={styles.li}><strong>Right of rectification</strong>: correct your information</li>
        <li style={styles.li}><strong>Right to erasure</strong>: delete your account and data</li>
        <li style={styles.li}><strong>Right to data portability</strong>: receive your data in a structured format</li>
      </ul>
      <p style={styles.p}>
        To exercise these rights: <a style={styles.a} href="mailto:murierromain@gmail.com">murierromain@gmail.com</a><br />
        You may also lodge a complaint with the <strong>CNIL</strong>:{" "}
        <a style={styles.a} href="https://www.cnil.fr" target="_blank" rel="noreferrer">www.cnil.fr</a>
      </p>

      <h2 style={styles.h2}>9. Cookies and trackers</h2>
      <p style={styles.p}>
        Omnia does not use advertising or behavioral tracking cookies. An anonymous identifier (UUID) is stored locally on your device to count unique connections for statistical purposes. This identifier contains no personal data and is not transmitted to third parties.
      </p>
      <p style={styles.p}>Strictly necessary cookies for service operation (authentication, session) may also be used.</p>

      <h2 style={styles.h2}>10. Security</h2>
      <p style={styles.p}>
        All communications are secured by HTTPS. Personal data is encrypted. The API is secured by authentication.
      </p>

      <h2 style={styles.h2}>11. Changes to these Terms</h2>
      <p style={styles.p}>
        In case of changes to these terms, you will be notified by email. Continued use of the service constitutes acceptance of the updated terms.
      </p>

      <h2 style={styles.h2}>12. Applicable law</h2>
      <p style={styles.p}>
        These Terms are governed by French law. In case of dispute, the courts of the publisher's jurisdiction shall have exclusive competence.
      </p>
    </>
  );
}
