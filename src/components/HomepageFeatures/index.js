import clsx from 'clsx';
import Link from '@docusaurus/Link';
import Heading from '@theme/Heading';
import styles from './styles.module.css';

const FeatureList = [
  {
    title: 'Verifiable identity',
    description: (
      <>
        Every agent and user gets a Decentralized Identifier backed by a
        keypair. Actions are tied to a key that only one party controls, so
        provenance is something you can check rather than something you trust.
      </>
    ),
    to: '/docs/concepts/mental-model',
  },
  {
    title: 'Signed chain of custody',
    description: (
      <>
        Each message wraps and signs the one before it. The signature at the top
        of a chain covers every earlier hop, so the final record proves who
        asked whom, all the way back to the original intent.
      </>
    ),
    to: '/docs/sdk/envelope-and-chain',
  },
  {
    title: 'Policy-checked actions',
    description: (
      <>
        Before an agent touches the outside world, its action is checked against
        a signed policy card. The allow or deny decision is recorded in the
        audit trail next to the action it governed.
      </>
    ),
    to: '/docs/sdk/cbac',
  },
];

function Feature({title, description, to}) {
  return (
    <div className={clsx('col col--4')}>
      <div className={styles.featureCard}>
        <Heading as="h3">{title}</Heading>
        <p>{description}</p>
        <Link to={to}>Learn more</Link>
      </div>
    </div>
  );
}

export default function HomepageFeatures() {
  return (
    <section className={styles.features}>
      <div className="container">
        <div className="row">
          {FeatureList.map((props, idx) => (
            <Feature key={idx} {...props} />
          ))}
        </div>
      </div>
    </section>
  );
}
