/** External Dependencies */
import React from 'react';
import PropTypes from 'prop-types';

/** Internal Dependencies */
import Separator from 'components/common/Separator';
import { usePhoneScreen, useStore } from 'hooks';
import { Menu } from '@scaleflex/icons';
import CloseButton from './CloseButton';
import SaveButton from './SaveButton';
import ResetButton from './ResetButton';
import UndoButton from './UndoButton';
import RedoButton from './RedoButton';
import ImageDimensionsAndDisplayToggle from './ImageDimensionsAndDisplayToggle';
import CanvasZooming from './CanvasZooming';
import {
  StyledTopbar,
  StyledFlexCenterAlignedContainer,
  StyledMainButtonsWrapper,
  StyledHistoryButtonsWrapper,
  StyledHistoryButtons,
  StyledZoomingButtons,
  StyledMenuIconButton,
} from './Topbar.styled';
import BackButton from './BackButton';

const Topbar = ({ toggleMainMenu }) => {
  const {
    config: { showBackButton, disableZooming },
  } = useStore();

  const isPhoneScreen = usePhoneScreen(363);

  return (
    <StyledTopbar className="FIE_topbar" isPhoneScreen={isPhoneScreen}>
      <StyledMainButtonsWrapper className="FIE_topbar-buttons-wrapper">
        <StyledMenuIconButton
          className="FIE_tabs_toggle_btn"
          size={isPhoneScreen ? 'sm' : 'lg'}
          color="basic"
          onClick={() => toggleMainMenu(true)}
        >
          {(props) => <Menu {...props} />}
        </StyledMenuIconButton>
        {showBackButton ? <BackButton /> : <SaveButton />}
      </StyledMainButtonsWrapper>

      <StyledFlexCenterAlignedContainer
        className="FIE_topbar-center-options"
        showBackButton={showBackButton}
      >
        <StyledZoomingButtons>
          <ImageDimensionsAndDisplayToggle showBackButton={showBackButton} />

          {!disableZooming && (
            <>
              <Separator />
              <CanvasZooming showBackButton={showBackButton} />
            </>
          )}
        </StyledZoomingButtons>
      </StyledFlexCenterAlignedContainer>

      <StyledHistoryButtonsWrapper className="FIE_topbar-history-buttons">
        <StyledHistoryButtons>
          <ResetButton margin="0" showBackButton={showBackButton} />
          <UndoButton margin="0" showBackButton={showBackButton} />
          <RedoButton margin="0" showBackButton={showBackButton} />
        </StyledHistoryButtons>

        {showBackButton ? <SaveButton /> : <CloseButton />}
      </StyledHistoryButtonsWrapper>
    </StyledTopbar>
  );
};

Topbar.defaultProps = {
  toggleMainMenu: () => {},
};

Topbar.propTypes = {
  toggleMainMenu: PropTypes.func,
};

export default Topbar;
