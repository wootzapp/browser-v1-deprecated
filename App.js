import React, {useState, useRef, createRef, useCallback, useMemo} from 'react';
import {
  ActivityIndicator,
  SafeAreaView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import {WebView} from 'react-native-webview';
import _ from 'lodash';
import {Wallet} from 'ethers';
import BottomSheet, {BottomSheetView} from '@gorhom/bottom-sheet';
import CustomBackground from './CustomBackground';
import web3 from 'web3';

export default function App() {
  const [url, seturl] = useState('https://pancakeswap.finance/');
  const [canGoForward, setCanGoForward] = useState(false);
  const [canGoBack, setCanGoBack] = useState(false);
  const [loader, setLoader] = useState(false);
  const [title, setTitle] = useState('');
  const webview = createRef();
  const inputRef = useRef(null);
  const [popupView, setPopupView] = React.useState(false);
  const [address, setAddress] = React.useState('');

  React.useEffect(() => {
    generateWallet();
  }, []);

  // hooks
  const sheetRef = useRef(null);

  const snapPoints = useMemo(() => ['50%'], []);

  const handleSnapPress = useCallback(index => {
    sheetRef.current?.snapToIndex(index);
  }, []);

  const generateWallet = () => {
    const wallet = Wallet.createRandom();
    console.log(wallet.address);
    setAddress(wallet.address);
  };

  const getJsCode = address => {
    return `if(typeof EthereumProvider === "undefined"){
var callbackId = 0;
var callbacks = {};

bridgeSend = function (data) {
    ReactNativeWebView.postMessage(JSON.stringify(data));
}

function sendAPIrequest(permission, params) {
    var messageId = callbackId++;
    var params = params || {};

    bridgeSend({
        type: 'api-request',
        permission: permission,
        messageId: messageId,
        params: params
    });

    return new Promise(function (resolve, reject) {
        params['resolve'] = resolve;
        params['reject'] = reject;
        callbacks[messageId] = params;
    });
}

function qrCodeResponse(data, callback){
    var result = data.data;
    var regex = new RegExp(callback.regex);
    if (!result) {
        if (callback.reject) {
            callback.reject(new Error("Cancelled"));
        }
    }
    else if (regex.test(result)) {
        if (callback.resolve) {
            callback.resolve(result);
        }
    } else {
        if (callback.reject) {
            callback.reject(new Error("Doesn't match"));
        }
    }
}

function Unauthorized() {
  this.name = "Unauthorized";
  this.id = 4100;
  this.message = "The requested method and/or account has not been authorized by the user.";
}
Unauthorized.prototype = Object.create(Error.prototype);

function UserRejectedRequest() {
  this.name = "UserRejectedRequest";
  this.id = 4001;
  this.message = "The user rejected the request.";
}
UserRejectedRequest.prototype = Object.create(Error.prototype);

ReactNativeWebView.onMessage = function (message)
{
    data = JSON.parse(message);
    var id = data.messageId;
    var callback = callbacks[id];

    if (callback) {
        if (data.type === "api-response") {
            if (data.permission == 'qr-code'){
                qrCodeResponse(data, callback);
            } else if (data.isAllowed) {
                if (data.permission == 'web3') {
                    currentAccountAddress = data.data[0];
                }
                callback.resolve(data.data);
            } else {
                callback.reject(new UserRejectedRequest());
            }
        }
        else if (data.type === "web3-send-async-callback")
        {
            if (callback.beta)
            {
                if (data.error)
                {
                    if (data.error.code == 4100)
                        callback.reject(new Unauthorized());
                    else
                        //TODO probably if rpc returns empty result we need to call resolve with empty data?
                        callback.reject(data.error);
                }
                else{
                // TODO : according to https://github.com/ethereum/EIPs/blob/master/EIPS/eip-1193.md#examples
                // TODO : we need to return data.result.result here, but for some reason some dapps (uniswap)
                // TODO : expects jsonrpc
                    callback.resolve(data.result);
                }
            }
            else if (callback.results)
            {
                callback.results.push(data.error || data.result);
                if (callback.results.length == callback.num)
                    callback.callback(undefined, callback.results);
            }
            else
            {
                callback.callback(data.error, data.result);
            }
        }
    }
};

function web3Response (payload, result){
    return {id: payload.id,
            jsonrpc: "2.0",
            result: result};
}

function getSyncResponse (payload) {
    if (payload.method == "eth_accounts" && (typeof currentAccountAddress !== "undefined")) {
        return web3Response(payload, [currentAccountAddress])
    } else if (payload.method == "eth_coinbase" && (typeof currentAccountAddress !== "undefined")) {
        return web3Response(payload, currentAccountAddress)
    } else if (payload.method == "net_version" || payload.method == "eth_chainId"){
        return web3Response(payload, networkId)
    } else if (payload.method == "eth_uninstallFilter"){
        return web3Response(payload, true);
    } else {
        return null;
    }
}

var StatusAPI = function () {};

StatusAPI.prototype.getContactCode = function () {
    return sendAPIrequest('contact-code');
};

var EthereumProvider = function () {};

EthereumProvider.prototype.isStatus = true;
EthereumProvider.prototype.status = new StatusAPI();
EthereumProvider.prototype.isConnected = function () { return true; };

EthereumProvider.prototype.enable = function () {
    return sendAPIrequest('web3');
};

EthereumProvider.prototype.scanQRCode = function (regex) {
    return sendAPIrequest('qr-code', {regex: regex});
};

//Support for legacy send method
EthereumProvider.prototype.sendSync = function (payload)
{
    if (payload.method == "eth_uninstallFilter"){
        this.sendAsync(payload, function (res, err) {})
    }
    var syncResponse = getSyncResponse(payload);
    if (syncResponse){
        return syncResponse;
    } else {
        return web3Response(payload, null);
    }
};

EthereumProvider.prototype.send = function (method, params = [])
{
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

    if (method == 'eth_requestAccounts'){
        return sendAPIrequest('web3');
    }

    var syncResponse = getSyncResponse({method: method});
    if (syncResponse){
        return new Promise(function (resolve, reject) {
                                   resolve(syncResponse);
                               });
    }

    var messageId = callbackId++;
    var payload = {id:      messageId,
                   jsonrpc: "2.0",
                   method:  method,
                   params:  params};

    bridgeSend({type:      'web3-send-async-read-only',
                messageId: messageId,
                payload:   payload});

    return new Promise(function (resolve, reject) {
                           callbacks[messageId] = {beta:    true,
                                                   resolve: resolve,
                                                   reject:  reject};
                       });
};

//Support for legacy sendAsync method
EthereumProvider.prototype.sendAsync = function (payload, callback)
{
  var syncResponse = getSyncResponse(payload);
  if (syncResponse && callback) {
      callback(null, syncResponse);
  }
  else
  {
      var messageId = callbackId++;

      if (Array.isArray(payload))
      {
          callbacks[messageId] = {num:      payload.length,
                                  results:  [],
                                  callback: callback};
          for (var i in payload) {
              bridgeSend({type:      'web3-send-async-read-only',
                          messageId: messageId,
                          payload:   payload[i]});
          }
      }
      else
      {
          callbacks[messageId] = {callback: callback};
          bridgeSend({type:      'web3-send-async-read-only',
                      messageId: messageId,
                      payload:   payload});
      }
  }
};
}

ethereum = new EthereumProvider();
(function () {
    var history = window.history;
    var pushState = history.pushState;
    history.pushState = function(state) {
        setTimeout(function () {
            bridgeSend({
               type: 'history-state-changed',
               navState: { url: location.href, title: document.title }
            });
        }, 100);
        return pushState.apply(history, arguments);
    };
}());
`;
  };

  const injectJavaScript = address => {
    const jsCode = getJsCode(address);
    return jsCode;
  };

  const onMessage = async event => {
    console.log('_onMessage', JSON.parse(event.nativeEvent.data));
    const res = JSON.parse(event.nativeEvent.data);
    const {type} = res;

    switch (type) {
      case 'api-request': {
        handleConnectWallet();
        break;
      }
    }
  };

  const handleConnectWallet = () => {
    handleSnapPress(0);
    setPopupView(true);
  };

  const postMessageToWebView = result => {
    this.webview.current.postMessage(result);
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
          }}>
          <Text style={{alignSelf: 'center'}}>Hello Metamask</Text>
        </BottomSheetView>
      </BottomSheet>
    );
  };

  const handleWalletAddEthereumChain = () => {};

  const handleEthEstimateGas = async payload => {
    const {params, id} = payload;
    const res = await web3.estimateGas(params[0]);
    const estimateGas = Number(res);
    const result = {id, result: estimateGas};
    postMessageToWebView(result);
  };

  const handleEthGasPrice = async payload => {
    const {id} = payload;
    const res = await web3.getGasPrice();
    const result = {id, result: res};
    postMessageToWebView(result);
  };

  const handleEthCall = async payload => {
    const {id, params} = payload;
    const res = await web3.call(params[0], params[1]);
    const result = {id, result: res};
    postMessageToWebView(result);
  };

  const handleEthGetBlockByNumber = async payload => {
    const {id, params} = payload;
    let res = 0;
    // Get latest block info when passed block number is 0.
    const blockNumber =
      _.isEmpty(params) || (params[0] && params[0] === '0x0')
        ? 'latest'
        : params[0];
    res = await web3.getBlock(blockNumber);
    const result = {id, result: res};
    postMessageToWebView(result);
  };

  const handleEthGetBlockNumber = async payload => {
    const {id} = payload;
    const res = await web3.getBlockNumber();
    const result = {id, result: res};
    postMessageToWebView(result);
  };

  const handleEthGetTransactionReceipt = async payload => {
    const {id, params} = payload;
    let res = await web3.getTransactionReceipt(params[0]);
    if (!res) {
      res = '';
    } else {
      // RNS and tRif faucet's transaction status judge condition: parseInt(status, 16) === 1, so need set true to 1 and false to 0
      res.status = res.status ? 1 : 0;
    }
    const result = {id, result: res};
    postMessageToWebView(result);
  };

  const handleEthGetTransactionByHash = async payload => {
    const {id, params} = payload;
    const res = await web3.getTransaction(params[0]);
    const result = {id, result: res};
    postMessageToWebView(result);
  };

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
        seturl('https://www.' + uri);
        return 'https://www.' + uri;
      }
      seturl(uri);
      return uri;
    }
    // search for the text in the search engine

    const encodedURI = encodeURI(uri);
    seturl(searchEngines[searchEngine](encodedURI));
    return searchEngines[searchEngine](encodedURI);
  }

  const onNavigationStateChange = navState => {
    const {canGoForward, canGoBack, title, url} = navState;
    seturl(url);
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
          style={{flexDirection: 'row', alignItems: 'center', marginTop: 10}}>
          <TouchableOpacity activeOpacity={0.7} onPress={goBack}>
            <Text>icon</Text>
            <Text> {'<'} </Text>
          </TouchableOpacity>
          <TouchableOpacity
            disabled={!canGoForward}
            activeOpacity={0.7}
            onPress={goForward}>
            <Text>icon</Text>
            <Text> {'>'} </Text>
          </TouchableOpacity>
          <TextInput
            ref={inputRef}
            autoCapitalize="none"
            defaultValue={url}
            onSubmitEditing={() => upgradeURL(url)}
            returnKeyType="search"
            onChangeText={val => seturl(val)}
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

        <WebView
          ref={webview}
          source={{uri: url}}
          onNavigationStateChange={onNavigationStateChange}
          onLoadStart={() => setLoader(true)}
          onLoadEnd={() => setLoader(false)}
          injectedJavaScriptBeforeContentLoaded={injectJavaScript(address)}
          javaScriptEnabled
          onMessage={onMessage}
        />

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
