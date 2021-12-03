import React, {createRef, useCallback, useMemo, useRef, useState} from 'react';
import {
  ActivityIndicator,
  Platform,
  SafeAreaView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import {WebView} from 'react-native-webview';
import '@ethersproject/shims';
import {Wallet} from 'ethers';
import BottomSheet, {BottomSheetView} from '@gorhom/bottom-sheet';
import CustomBackground from './CustomBackground';
import * as RNFS from 'react-native-fs';
import Icon from 'react-native-vector-icons/FontAwesome';
import {Picker} from '@react-native-picker/picker';

export default function App() {
  const [url, setUrl] = useState('https://pancakeswap.finance/');
  const [canGoForward, setCanGoForward] = useState(false);
  const [canGoBack, setCanGoBack] = useState(false);
  const [loader, setLoader] = useState(false);
  const [title, setTitle] = useState('');
  const webview = createRef();
  const inputRef = useRef(null);
  const [popupView, setPopupView] = React.useState(false);
  const [providerJs, setProviderJs] = React.useState('');
  const [webviewJs, setWebviewJs] = React.useState('');
  const [loadingWallet, setLoadingWallet] = React.useState(false);
  const [wallets, setWallets] = React.useState([]);
  const [selectedAddress, setSelectedAddress] = React.useState('');

  React.useEffect(() => {
    loadJsFiles();
  }, []);

  // hooks
  const sheetRef = useRef(null);

  const snapPoints = useMemo(() => ['50%'], []);

  const handleSnapPress = useCallback(index => {
    sheetRef.current?.snapToIndex(index);
  }, []);

  const loadJsFiles = () => {
    if (providerJs === '') {
      if (Platform.OS === 'ios') {
        RNFS.readFile(`${RNFS.MainBundlePath}/provider.js`, 'utf8').then(
          content => {
            setProviderJs(content);
          },
        );
      } else {
        RNFS.readFileAssets('provider.js', 'utf8').then(content => {
          setProviderJs(content);
        });
      }
    }

    if (webviewJs === '') {
      if (Platform.OS === 'ios') {
        RNFS.readFile(`${RNFS.MainBundlePath}/webview.js`, 'utf8').then(
          content => {
            setWebviewJs(content);
          },
        );
      } else {
        RNFS.readFileAssets('webview.js', 'utf8').then(content => {
          setWebviewJs(content);
        });
      }
    }
    console.log('finished load js');
  };

  const injectJavaScript = () => {
    return `${providerJs}${webviewJs}
    console.log(window);

    const communicateWithRN = (payload) => {
      return new Promise((resolve, reject) => {
        console.log('JSON.stringify(payload): ', JSON.stringify(payload));
        window.ReactNativeWebView.postMessage(JSON.stringify(payload));
      })
    }

      EthereumProvider.prototype.send = function (method, params = []) {
    console.log('method send: ', method);
    if (!method) {
      return new Error('Request is not valid.');
    }

    if (!(params instanceof Array)) {
      return new Error('Params is not a valid array.');
    }

    //Support for legacy send method
    if (typeof method !== 'string') {
      return this.sendSync(method);
    }
    
    var messageId = callbackId++;
    var payload = {
      id: messageId,
      jsonrpc: '2.0',
      method: method,
      params: params,
    };
    
    return communicateWithRN(payload)
  };
    `;
  };

  const onMessage = async event => {
    console.log('_onMessage JSON PARSE', JSON.parse(event.nativeEvent.data));
    const res = JSON.parse(event.nativeEvent.data);

    switch (res.method) {
      case 'eth_requestAccounts': {
        handleConnectWallet(res.id);
        break;
      }
    }
  };

  const handleConnectWallet = id => {
    handleSnapPress(0);
    setPopupView(true);

    const result = {
      id: id,
      jsonrpc: '2.0',
      result: ['0x2F67AeE4bB75d53E606736D177dbCd4dF0311861'],
    };
    return postMessageToWebView(result);
  };

  const postMessageToWebView = result => {
    if (webview && webview.current) {
      webview.current.postMessage(JSON.stringify(result));
    } else {
      console.log('no webview or webview.current');
    }
  };

  const popupMessageModal = () => {
    return (
      <BottomSheet
        enabled={true}
        backgroundComponent={CustomBackground}
        ref={sheetRef}
        snapPoints={snapPoints}
        enablePanDownToClose={true}>
        <BottomSheetView
          style={{
            flex: 1,
            alignItems: 'center',
          }}>
          <Text>Hello Metamask</Text>
          {wallets.length === 0 ? (
            <Text style={{margin: 10}}>
              No wallets, you have to create a new one
            </Text>
          ) : (
            <Picker
              style={{width: '90%'}}
              selectedValue={selectedAddress}
              onValueChange={(itemValue, itemIndex) =>
                setSelectedAddress(itemValue)
              }>
              {wallets.map(wallet => {
                return <Picker.Item label={wallet} value={wallet} />;
              })}
            </Picker>
          )}

          {loadingWallet ? (
            <View style={{paddingHorizontal: 20}} activeOpacity={0.7}>
              <ActivityIndicator size="small" color="#000" />
            </View>
          ) : (
            <TouchableOpacity
              style={{borderWidth: 1, borderRadius: 10, padding: 5}}
              onPress={() => handleCreateWallet()}
              disabled={loadingWallet}>
              <Text>Create new wallet</Text>
            </TouchableOpacity>
          )}
        </BottomSheetView>
      </BottomSheet>
    );
  };

  const handleCreateWallet = () => {
    setLoadingWallet(true);

    console.log('Creating new wallet...');
    setTimeout(() => {
      const wallet = Wallet.createRandom();
      setWallets(oldArray => [...oldArray, wallet.address]);

      console.log(wallets, 'wallets');
      console.log('Wallet addres: ', wallet.address);
      setLoadingWallet(false);
    }, 500);
  };

  const handleWalletAddEthereumChain = () => {};

  // functions to search using different engines
  const searchEngines = {
    google: uri => `https://www.google.com/search?q=${uri}`,
    duckduckgo: uri => `https://duckduckgo.com/?q=${uri}`,
    bing: uri => `https://www.bing.com/search?q=${uri}`,
  };

  // upgrade the url to make it easier for the user:
  //
  // https://www.facebook.com => https://www.facebook.com
  // facebook.com => https://www.facebook.com
  // facebook => https://www.google.com/search?q=facebook
  function upgradeURL(uri, searchEngine = 'google') {
    const isURL = uri.split(' ').length === 1 && uri.includes('.');
    if (isURL) {
      if (!uri.startsWith('http')) {
        setUrl('https://www.' + uri);
        return 'https://www.' + uri;
      }
      setUrl(uri);
      return uri;
    }
    // search for the text in the search engine

    const encodedURI = encodeURI(uri);
    setUrl(searchEngines[searchEngine](encodedURI));
    return searchEngines[searchEngine](encodedURI);
  }

  const onNavigationStateChange = navState => {
    const {canGoForward, canGoBack, title, url} = navState;
    setUrl(url);
    setTitle(title);
    setCanGoBack(canGoBack);
    setCanGoForward(canGoForward);
  };

  // // go to the next page
  const goForward = () => {
    if (webview && canGoForward) {
      webview.current.goForward();
    }
  };

  // // go back to the last page
  const goBack = () => {
    if (webview && canGoBack) {
      webview.current.goBack();
    }
  };

  return (
    <View style={styles.container}>
      <SafeAreaView style={{flex: 1}}>
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            marginTop: 10,
          }}>
          <TouchableOpacity
            activeOpacity={0.7}
            onPress={goBack}
            style={{marginRight: 10}}>
            <Icon
              name="chevron-left"
              size={20}
              color={canGoBack ? '#000' : '#808080'}
            />
          </TouchableOpacity>

          <TouchableOpacity
            disabled={!canGoForward}
            activeOpacity={0.7}
            onPress={goForward}>
            <Icon
              name="chevron-right"
              size={20}
              color={canGoForward ? '#000' : '#808080'}
            />
          </TouchableOpacity>

          <TextInput
            ref={inputRef}
            autoCapitalize="none"
            defaultValue={url}
            onSubmitEditing={() => upgradeURL(url)}
            returnKeyType="search"
            onChangeText={val => setUrl(val)}
            clearButtonMode="while-editing"
            autoCorrect={false}
            style={[styles.addressBarTextInput]}
          />

          {loader ? (
            <View style={{paddingHorizontal: 20}} activeOpacity={0.7}>
              <ActivityIndicator size="small" color="#000" />
            </View>
          ) : null}
        </View>

        {webviewJs !== '' && providerJs !== '' ? (
          <WebView
            ref={webview}
            source={{uri: url}}
            onNavigationStateChange={onNavigationStateChange}
            onLoadStart={() => setLoader(true)}
            onLoadEnd={() => setLoader(false)}
            injectedJavaScriptBeforeContentLoaded={injectJavaScript()}
            javaScriptEnabled
            onMessage={onMessage}
          />
        ) : (
          <View style={{paddingHorizontal: 20}} activeOpacity={0.7}>
            <ActivityIndicator size="small" color="#000" />
          </View>
        )}

        {popupView && popupMessageModal()}
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  addressBarTextInput: {
    backgroundColor: '#fff',
    borderColor: 'transparent',
    borderRadius: 3,
    borderWidth: 1,
    height: 55,
    paddingLeft: 10,
    fontSize: 14,
    flex: 1,
    marginHorizontal: 10,
  },
});
