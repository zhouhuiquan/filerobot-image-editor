/** External Dependencies */
import React from 'react';
import { Button } from '@scaleflex/ui/core';
import ArrowLeftOutline from '@scaleflex/icons/arrow-left-outline';

/** Internal Dependencies */
import { useStore } from 'hooks';
import { StyledBackButtonLabel } from './Topbar.styled';
import ConfirmationModal from './ConfirmationModal';

const BackButton = () => {
  const { t } = useStore();

  return (
    <ConfirmationModal>
      <Button
        className="FIE_topbar-back-button"
        color="link-secondary"
        size="sm"
        startIcon={<ArrowLeftOutline />}
      >
        <StyledBackButtonLabel>{t('back')}</StyledBackButtonLabel>
      </Button>
    </ConfirmationModal>
  );
};

export default BackButton;
