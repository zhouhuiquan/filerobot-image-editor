/** External Dependencies */
import React, {
  memo,
  useCallback,
  useEffect,
  useState,
  useRef,
  useMemo,
} from 'react';

/** Internal Dependencies */
import MainCanvas from 'components/MainCanvas';
import { ROOT_CONTAINER_CLASS_NAME } from 'utils/constants';
import Topbar from 'components/Topbar';
import Tabs from 'components/Tabs';
import ToolsBar from 'components/ToolsBar';
import {
  HIDE_LOADER,
  SELECT_TAB,
  SET_FEEDBACK,
  SET_ORIGINAL_IMAGE,
  SET_SHOWN_TABS_MENU,
  SHOW_LOADER,
  UPDATE_STATE,
} from 'actions';
import FeedbackPopup from 'components/FeedbackPopup';
import loadImage from 'utils/loadImage';
import {
  usePhoneScreen,
  useResizeObserver,
  useStore,
  useTransformedImgData,
} from 'hooks';
import Spinner from 'components/common/Spinner';
import { getBackendTranslations } from 'utils/translator';
import cloudimageQueryToDesignState from 'utils/cloudimageQueryToDesignState';
import finetunesStrsToClasses from 'utils/finetunesStrsToClasses';
import filterStrToClass from 'utils/filterStrToClass';
import isSameImage from 'utils/isSameImage';
import { AVAILABLE_TABS } from 'components/Tabs/Tabs.constants';
import TabsDrawer from 'components/TabsDrawer';
import {
  StyledAppWrapper,
  StyledMainContent,
  StyledCanvasAndTools,
  StyledPhoneToolsAndTabs,
} from './App.styled';

const App = () => {
  const {
    config,
    isLoadingGlobally,
    haveNotSavedChanges,
    dispatch,
    originalImage,
    shownImageDimensions,
    t,
    theme,
    feedback = {},
  } = useStore();
  const {
    loadableDesignState,
    tabsIds,
    useCloudimage,
    cloudimage,
    source,
    avoidChangesNotSavedAlertOnLeave,
    useBackendTranslations,
    translations,
    language,
    defaultSavedImageName,
    observePluginContainerSize,
    showCanvasOnly,
    getCurrentImgDataFnRef,
    updateStateFnRef,
    noCrossOrigin,
  } = config;

  const [observeResize, unobserveElement] = useResizeObserver();
  const [rootSize, setRootSize] = useState({
    width: undefined,
    height: undefined,
  });
  const isPhoneScreen = usePhoneScreen();
  const pluginRootRef = useRef(null);
  const isFirstRender = useRef(true);
  const cloudimageQueryLoaded = useRef(false);
  const imageBeingLoadedSrc = useRef(null);
  // Hacky solution, For being used in beforeunload event
  // as it won't be possible to have the latest value of the state variable in js event handler.
  const haveNotSavedChangesRef = useRef(haveNotSavedChanges);
  const transformImgFn = useTransformedImgData();

  const setNewOriginalImage = useCallback((newOriginalImage) => {
    dispatch({
      type: SET_ORIGINAL_IMAGE,
      payload: {
        originalImage: newOriginalImage,
      },
    });
  }, []);

  const setError = useCallback((newError) => {
    dispatch({
      type: SET_FEEDBACK,
      payload: {
        feedback: {
          message: newError.message || newError,
          duration: 0,
        },
      },
    });
  }, []);

  // We are promisifying the image loading for mixing it with other promises
  const loadAndSetOriginalImage = (imgToLoad) =>
    new Promise((resolve) => {
      const imgSrc = imgToLoad?.src || imgToLoad;
      if (
        imageBeingLoadedSrc.current === imgSrc ||
        (!imgSrc && originalImage) ||
        isSameImage(imgSrc, originalImage)
      ) {
        if (!imageBeingLoadedSrc.current) {
          resolve();
        }
        return;
      }

      const triggerResolve = () => {
        imageBeingLoadedSrc.current = null;
        resolve();
      };

      imageBeingLoadedSrc.current = imgSrc;

      // This timeout is a workaround when re-initializing
      // the react app from vanilla JS. Due to a bug in react
      // the dispatch method that is called in setNewOriginalImage
      // still points to the old dispatch method after re-init,
      // so we need to wait for one tick to make sure it's updated.
      //
      // This applies to both URLs and HTMLImageElement, since URLs
      // may resolve immediately in some cases, e.g. memory cache.
      setTimeout(() => {
        if (typeof imgToLoad === 'string') {
          loadImage(imgToLoad, defaultSavedImageName, noCrossOrigin)
            .then(setNewOriginalImage)
            .catch(setError)
            .finally(triggerResolve);
        } else if (imgToLoad instanceof HTMLImageElement) {
          if (!imgToLoad.name && defaultSavedImageName) {
            // eslint-disable-next-line no-param-reassign
            imgToLoad.name = defaultSavedImageName;
          }
          if (!imgToLoad.complete) {
            imgToLoad.addEventListener('load', () => {
              setNewOriginalImage(imgToLoad);
              triggerResolve();
            });
            return;
          }

          setNewOriginalImage(imgToLoad);
          triggerResolve();
        } else {
          setError(t('invalidImageError'));
          triggerResolve();
        }
      }, 0);
    });

  const promptDialogIfHasChangeNotSaved = (e) => {
    if (haveNotSavedChangesRef.current) {
      e.preventDefault();
      e.returnValue = '';
    }
  };

  // loadingPromisesFn is a function for enabling the ability to show loader first then trigger requests not vice versa.
  const handleLoading = (loadingPromisesFn = () => []) => {
    dispatch({ type: SHOW_LOADER });

    return Promise.all(loadingPromisesFn()).finally(() => {
      dispatch({ type: HIDE_LOADER });
    });
  };

  const updateDesignStateWithLoadableOne = () => {
    if (loadableDesignState && Object.keys(loadableDesignState).length > 0) {
      dispatch({
        type: UPDATE_STATE,
        payload: {
          ...loadableDesignState,
          finetunes: finetunesStrsToClasses(loadableDesignState?.finetunes),
          filter: filterStrToClass(loadableDesignState?.filter),
        },
      });
    }
  };

  useEffect(() => {
    if (
      !isFirstRender.current &&
      source &&
      !isSameImage(source, originalImage)
    ) {
      cloudimageQueryLoaded.current = false;
      handleLoading(() => [loadAndSetOriginalImage(source)]);
    }
  }, [source]);

  useEffect(() => {
    if (!isFirstRender.current) {
      const newImgSrc = loadableDesignState?.imgSrc;
      if (newImgSrc && !isSameImage(newImgSrc, originalImage)) {
        handleLoading(() => [
          loadAndSetOriginalImage(newImgSrc).then(
            updateDesignStateWithLoadableOne,
          ),
        ]);
      } else {
        updateDesignStateWithLoadableOne();
      }
    }
  }, [loadableDesignState]);

  useEffect(() => {
    if (
      Object.keys(shownImageDimensions || {}).length > 0 &&
      !Object.keys(shownImageDimensions).some(
        (k) => !shownImageDimensions[k],
      ) &&
      originalImage &&
      useCloudimage &&
      cloudimage?.loadableQuery &&
      !cloudimageQueryLoaded.current
    ) {
      dispatch({
        type: UPDATE_STATE,
        payload: cloudimageQueryToDesignState(
          cloudimage.loadableQuery,
          shownImageDimensions,
          originalImage,
        ),
      });
      cloudimageQueryLoaded.current = true;
    }
  }, [shownImageDimensions, originalImage, useCloudimage, cloudimage]);

  useEffect(() => {
    let isUnmounted = false;
    if (observePluginContainerSize && pluginRootRef.current) {
      observeResize(pluginRootRef.current.parentNode, ({ width, height }) =>
        setRootSize({ width, height }),
      );
    } else if (rootSize.width && rootSize.height && !isUnmounted) {
      setRootSize({ width: undefined, height: undefined });
    }

    return () => {
      if (observePluginContainerSize && pluginRootRef.current) {
        unobserveElement(pluginRootRef.current);
      }

      isUnmounted = true;
    };
  }, [observePluginContainerSize]);

  useEffect(() => {
    const initialRequestsPromisesFn = () => [
      loadAndSetOriginalImage(loadableDesignState?.imgSrc || source),
      ...(useBackendTranslations
        ? [getBackendTranslations(language, translations)]
        : []),
    ];

    handleLoading(initialRequestsPromisesFn);
    isFirstRender.current = false;

    if (window && !avoidChangesNotSavedAlertOnLeave) {
      window.addEventListener('beforeunload', promptDialogIfHasChangeNotSaved);
    }

    return () => {
      if (window && !avoidChangesNotSavedAlertOnLeave) {
        window.removeEventListener(
          'beforeunload',
          promptDialogIfHasChangeNotSaved,
        );
      }
    };
  }, []);

  useEffect(() => {
    if (updateStateFnRef && typeof updateStateFnRef === 'object') {
      updateStateFnRef.current = (newStatePartObjOrFn) => {
        dispatch({
          type: UPDATE_STATE,
          payload: newStatePartObjOrFn,
        });
      };
    }
  }, [updateStateFnRef, dispatch]);

  useEffect(() => {
    if (getCurrentImgDataFnRef && typeof getCurrentImgDataFnRef === 'object') {
      getCurrentImgDataFnRef.current = transformImgFn;
    }
  }, [transformImgFn]);

  useEffect(() => {
    haveNotSavedChangesRef.current = haveNotSavedChanges;
  }, [haveNotSavedChanges]);

  const chosenTabs = useMemo(() => {
    let tabs = [];
    if (Object.keys(tabsIds).length > 0) {
      AVAILABLE_TABS.forEach((tab) => {
        const index = tabsIds.indexOf(tab.id);
        if (index !== -1) {
          tabs[index] = tab;
        }
      });
    } else {
      tabs = AVAILABLE_TABS;
    }

    return (tabs.length > 0 ? tabs : AVAILABLE_TABS).filter(
      ({ hideFn }) => !hideFn || !hideFn({ useCloudimage }),
    );
  }, [tabsIds]);

  const toggleMainMenu = (open) => {
    dispatch({
      type: SET_SHOWN_TABS_MENU,
      payload: {
        opened: open,
      },
    });
  };

  const selectTab = useCallback((newTabId) => {
    dispatch({
      type: SELECT_TAB,
      payload: {
        tabId: newTabId,
      },
    });

    toggleMainMenu(false);
  }, []);

  return (
    <StyledAppWrapper
      className={ROOT_CONTAINER_CLASS_NAME}
      data-phone={isPhoneScreen}
      ref={pluginRootRef}
      $size={rootSize}
    >
      <TabsDrawer
        toggleMainMenu={toggleMainMenu}
        selectTab={selectTab}
        chosenTabs={chosenTabs}
      />
      {!showCanvasOnly && <Topbar toggleMainMenu={toggleMainMenu} />}
      {originalImage && feedback.duration !== 0 && (
        <StyledMainContent className="FIE_main-container">
          {!isPhoneScreen && !showCanvasOnly && (
            <Tabs selectTab={selectTab} chosenTabs={chosenTabs} />
          )}
          <StyledCanvasAndTools className="FIE_editor-content">
            {isLoadingGlobally ? <Spinner theme={theme} /> : <MainCanvas />}
            {!showCanvasOnly &&
              (isPhoneScreen ? (
                <StyledPhoneToolsAndTabs className="FIE_phone-tools-tabs-wrapper">
                  <ToolsBar isPhoneScreen={isPhoneScreen} />
                  <Tabs selectTab={selectTab} chosenTabs={chosenTabs} />
                </StyledPhoneToolsAndTabs>
              ) : (
                <ToolsBar />
              ))}
          </StyledCanvasAndTools>
        </StyledMainContent>
      )}
      <FeedbackPopup />
    </StyledAppWrapper>
  );
};

export default memo(App);
