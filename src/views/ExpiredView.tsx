import React from 'react';
import { DropletMascot } from '../components/brand';
import { Button, Card } from '../components/ui';
import { SparklesIcon, HomeIcon } from '../components/icons';

export interface ExpiredViewProps {
  onGoHome: () => void;
  reason?: string;
}

export const ExpiredView: React.FC<ExpiredViewProps> = ({
  onGoHome,
  reason = 'This room has reached its 24-hour expiration or was deleted by the owner.',
}) => {
  return (
    <div
      style={{
        maxWidth: '540px',
        margin: '60px auto',
        padding: '20px',
        textAlign: 'center',
      }}
    >
      <Card variant="default" padding="lg">
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '16px' }}>
          <DropletMascot size={120} mood="sleepy" withSparkles={false} />
        </div>

        <h2
          style={{
            fontFamily: 'var(--font-display)',
            fontSize: '28px',
            fontWeight: 800,
            color: 'var(--color-ink)',
            marginBottom: '10px',
          }}
        >
          Room Vanished!
        </h2>

        <p
          style={{
            fontFamily: 'var(--font-body)',
            fontSize: '15px',
            color: 'var(--color-muted)',
            lineHeight: 1.5,
            marginBottom: '24px',
          }}
        >
          {reason}
          <br />
          All shared items are automatically deleted to protect your privacy.
        </p>

        <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
          <Button
            variant="primary"
            leftIcon={<SparklesIcon size={16} />}
            onClick={onGoHome}
          >
            Create New Room
          </Button>

          <Button
            variant="surface"
            leftIcon={<HomeIcon size={16} />}
            onClick={onGoHome}
          >
            Return Home
          </Button>
        </div>
      </Card>
    </div>
  );
};

export default ExpiredView;
