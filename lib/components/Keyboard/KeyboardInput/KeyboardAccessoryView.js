import React, {Component} from 'react';
import PropTypes from 'prop-types';
import {
  StyleSheet,
  Platform,
  NativeModules,
  NativeEventEmitter,
  DeviceEventEmitter,
  processColor,
  BackHandler
} from 'react-native';
import KeyboardTrackingView from '../KeyboardTracking/KeyboardTrackingView';
import CustomKeyboardView from './CustomKeyboardView';
import KeyboardUtils from './utils/KeyboardUtils';

const IsIOS = Platform.OS === 'ios';
const IsAndroid = Platform.OS === 'android';

/**
 * @description: View that allows replacing the default keyboard with other components
 * @example: https://github.com/wix/react-native-ui-lib/blob/master/demo/src/screens/nativeComponentScreens/keyboardInput/KeyboardInputViewScreen.js
 */
class KeyboardAccessoryView extends Component {
  static propTypes = {
    /**
     * Content to be rendered above the keyboard
     */
    renderContent: PropTypes.func,
    /**
     * A callback for when the height is changed
     */
    onHeightChanged: PropTypes.func,
    /**
     * iOS only.
     * The reference to the actual text input (or the keyboard may not reset when instructed to, etc.).
     * This is required.
     */
    kbInputRef: PropTypes.object,
    /**
     * The keyboard ID (the componentID sent to KeyboardRegistry)
     */
    kbComponent: PropTypes.string,
    /**
     * The props that will be sent to the KeyboardComponent
     */
    kbInitialProps: PropTypes.object,
    /**
     * Callback that will be called when an item on the keyboard has been pressed.
     */
    onItemSelected: PropTypes.func,
    /**
     * TODO: complete docs
     */
    onRequestShowKeyboard: PropTypes.func,
    /**
     * Callback that will be called once the keyboard has been closed
     */
    onKeyboardResigned: PropTypes.func,
    /**
     * iOS only.
     * The scrolling behavior, use NativeModules.KeyboardTrackingViewManager.X where X is:
     * KeyboardTrackingScrollBehaviorNone - 0,
     * KeyboardTrackingScrollBehaviorScrollToBottomInvertedOnly - 1,
     * KeyboardTrackingScrollBehaviorFixedOffset - 2
     * 
     * KeyboardTrackingScrollBehaviorFixedOffset is the default
     */
    iOSScrollBehavior: PropTypes.number,
    /**
     * iOS only.
     * TODO: complete docs
     */
    revealKeyboardInteractive: PropTypes.bool,
    /**
     * iOS only.
     * TODO: complete docs
     */
    manageScrollView: PropTypes.bool,
    /**
     * iOS only.
     * TODO: complete docs
     */
    requiresSameParentToManageScrollView: PropTypes.bool,
    /**
     * iOS only.
     * TODO: complete docs
     */
    addBottomView: PropTypes.bool,
    /**
     * iOS only.
     * TODO: complete docs
     */
    allowHitsOutsideBounds: PropTypes.bool
  };

  static defaultProps = {
    iOSScrollBehavior: -1,
    revealKeyboardInteractive: false,
    manageScrollView: true,
    requiresSameParentToManageScrollView: false,
    addBottomView: false,
    allowHitsOutsideBounds: false
  };

  constructor(props) {
    super(props);

    this.onContainerComponentHeightChanged = this.onContainerComponentHeightChanged.bind(this);
    this.processInitialProps = this.processInitialProps.bind(this);
    this.registerForKeyboardResignedEvent = this.registerForKeyboardResignedEvent.bind(this);
    this.registerAndroidBackHandler = this.registerAndroidBackHandler.bind(this);
    this.onAndroidBackPressed = this.onAndroidBackPressed.bind(this);

    this.registerForKeyboardResignedEvent();
    this.registerAndroidBackHandler();
  }

  componentWillUnmount() {
    if (this.customInputControllerEventsSubscriber) {
      this.customInputControllerEventsSubscriber.remove();
    }
    if (IsAndroid) {
      BackHandler.removeEventListener('hardwareBackPress', this.onAndroidBackPressed);
    }
  }

  onContainerComponentHeightChanged(event) {
    const {onHeightChanged} = this.props;

    if (onHeightChanged) {
      onHeightChanged(event.nativeEvent.layout.height);
    }
  }

  onAndroidBackPressed() {
    const {kbComponent} = this.props;

    if (kbComponent) {
      KeyboardUtils.dismiss();
      return true;
    }
    return false;
  }

  getIOSTrackingScrollBehavior() {
    const {iOSScrollBehavior} = this.props;

    let scrollBehavior = iOSScrollBehavior;
    if (IsIOS && NativeModules.KeyboardTrackingViewManager && scrollBehavior === -1) {
      scrollBehavior = NativeModules.KeyboardTrackingViewManager.KeyboardTrackingScrollBehaviorFixedOffset;
    }
    return scrollBehavior;
  }

  async getNativeProps() {
    if (this.trackingViewRef) {
      return await this.trackingViewRef.getNativeProps();
    }
    return {};
  }

  registerForKeyboardResignedEvent() {
    const {onKeyboardResigned} = this.props;
    let eventEmitter = null;
    if (IsIOS) {
      if (NativeModules.CustomInputController) {
        eventEmitter = new NativeEventEmitter(NativeModules.CustomInputController);
      }
    } else {
      eventEmitter = DeviceEventEmitter;
    }

    if (eventEmitter !== null) {
      this.customInputControllerEventsSubscriber = eventEmitter.addListener('kbdResigned', () => {
        if (onKeyboardResigned) {
          onKeyboardResigned();
        }
      });
    }
  }

  registerAndroidBackHandler() {
    if (IsAndroid) {
      BackHandler.addEventListener('hardwareBackPress', this.onAndroidBackPressed);
    }
  }

  processInitialProps() {
    const {kbInitialProps} = this.props;

    if (IsIOS && kbInitialProps && kbInitialProps.backgroundColor) {
      const processedProps = Object.assign({}, kbInitialProps);
      processedProps.backgroundColor = processColor(processedProps.backgroundColor);
      return processedProps;
    }

    return kbInitialProps;
  }

  scrollToStart() {
    if (this.trackingViewRef) {
      this.trackingViewRef.scrollToStart();
    }
  }

  render() {
    const {
      revealKeyboardInteractive,
      manageScrollView,
      requiresSameParentToManageScrollView,
      addBottomView,
      allowHitsOutsideBounds,
      renderContent,
      kbInputRef,
      kbComponent,
      onItemSelected,
      onRequestShowKeyboard
    } = this.props;

    return (
      <KeyboardTrackingView
        ref={r => (this.trackingViewRef = r)}
        style={styles.trackingToolbarContainer}
        onLayout={this.onContainerComponentHeightChanged}
        scrollBehavior={this.getIOSTrackingScrollBehavior()}
        revealKeyboardInteractive={revealKeyboardInteractive}
        manageScrollView={manageScrollView}
        requiresSameParentToManageScrollView={requiresSameParentToManageScrollView}
        addBottomView={addBottomView}
        allowHitsOutsideBounds={allowHitsOutsideBounds}
      >
        {renderContent && renderContent()}
        <CustomKeyboardView
          inputRef={kbInputRef}
          component={kbComponent}
          initialProps={this.processInitialProps()}
          onItemSelected={onItemSelected}
          onRequestShowKeyboard={onRequestShowKeyboard}
        />
      </KeyboardTrackingView>
    );
  }
}

const styles = StyleSheet.create({
  trackingToolbarContainer: {
    ...Platform.select({
      ios: {
        ...StyleSheet.absoluteFillObject,
        top: undefined
      }
    })
  }
});

export default KeyboardAccessoryView;