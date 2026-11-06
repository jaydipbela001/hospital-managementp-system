import React from 'react';
import { PageHeader, EmptyState, Button } from '../../components/common';

export function ModulePlaceholder({
  moduleName,
  description,
  plannedPhase,
  icon,
}) {
  return (
    <div>
      <PageHeader
        title={moduleName}
        subtitle={description}
        actions={
          <Button variant="outline" size="sm" onClick={() => alert(`Module scheduled for ${plannedPhase}`)}>
            View Documentation
          </Button>
        }
      />
      <EmptyState
        icon={icon}
        title={`${moduleName} Module`}
        description={`This module is scheduled for implementation in ${plannedPhase}. The UI shell, routing, and design tokens are established.`}
      />
    </div>
  );
}

export default ModulePlaceholder;

