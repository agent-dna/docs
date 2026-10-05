import clsx from 'clsx';
import Link from '@docusaurus/Link';
import Heading from '@theme/Heading';
import styles from './styles.module.css';

const FeatureList = [
  {
    title: 'Chain of Custody Authentication',
    description: (
      <>
        CoCA captures every interaction between participants as a
        cryptographically signed Envelope, forming a verifiable chain of
        custody from the original requester to the final outcome.
      </>
    ),
    to: '/docs/concepts/coca-and-cbac#1-chain-of-custody-authentication-coca',
  },
  {
    title: 'Context Based Access Control',
    description: (
      <>
        CBAC verifies every signed participant in the chain and validates
        that the Agent's current policy permits the requested action,
        calculating a Trust score for the Agent.
      </>
    ),
    to: '/docs/concepts/coca-and-cbac#2-context-based-access-control-cbac',
  },
  {
    title: 'Immutable Provenance',
    description: (
      <>
        Every completed workflow can be committed to the Provenance Layer as
        an immutable, tamper-evident provenance record.
      </>
    ),
    to: '/docs/concepts/coca-and-cbac#3-immutable-provenance',
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
