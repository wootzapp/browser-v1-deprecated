import React, {useState, useRef} from 'react';
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
import RNFS from 'react-native-fs';
import _ from 'lodash';

export default function App() {
  const [url, seturl] = useState('https://www.google.com');
  const [input, setInput] = useState('');
  const [canGoForward, setCanGoForward] = useState(false);
  const [canGoBack, setCanGoBack] = useState(false);
  const [loader, setLoader] = useState(false);
  const [title, setTitle] = useState('');
  const browserRef = useRef(null);
  const inputRef = useRef(null);
  const [web3JsContent, setWeb3JsContent] = React.useState('');
  const [ethersJsContent, setEthersJsContent] = React.useState('');

  React.useEffect(() => {
    if (web3JsContent === '') {
      if (Platform.OS === 'ios') {
        RNFS.readFile(`${RNFS.MainBundlePath}/web3.1.2.7.js`, 'utf8').then(
          content => {
            console.log(content, 'log the content');
            setWeb3JsContent(content);
          },
        );
      } else {
        RNFS.readFileAssets('web3.1.2.7.js', 'utf8').then(content => {
          console.log(content, 'log the content');

          setWeb3JsContent(content);
        });
      }
    }
    if (ethersJsContent === '') {
      if (Platform.OS === 'ios') {
        RNFS.readFile(`${RNFS.MainBundlePath}/ethers5.0.js`, 'utf8').then(
          content => {
            console.log(content, 'log the content');

            setEthersJsContent(content);
          },
        );
      } else {
        RNFS.readFileAssets('ethers5.0.js', 'utf8').then(content => {
          console.log(content, 'log the content');

          setEthersJsContent(content);
        });
      }
    }
  }, []);

  const getJsCode = address => {
    const dappName = 'Money on Chain,';
    const rskEndpoint = 'Money on Chain,';
    const networkVersion = 8080;

    return `
      ${web3JsContent}
      ${ethersJsContent}
        (function() {
          let resolver = {};
          let rejecter = {};
          ${
            Platform.OS === 'ios' ? 'window' : 'document'
          }.addEventListener("message", function(data) {
            try {
              const passData = data.data ? JSON.parse(data.data) : data.data;
              const { id, result } = passData;
              if (result && result.error && rejecter[id]) {
                rejecter[id](new Error(result.message));
              } else if (resolver[id]) {
                resolver[id](result);
              }
            } catch(err) {
              console.log('listener message err: ', err);
            }
          })
          communicateWithRN = (payload) => {
            return new Promise((resolve, reject) => {
              console.log('JSON.stringify(payload): ', JSON.stringify(payload));
              window.ReactNativeWebView.postMessage(JSON.stringify(payload));
              const { id } = payload;
              resolver[id] = resolve;
              rejecter[id] = reject;
            })
          }
          function initNotification() {
            setInterval(() => {
              if (!window.Notification) {
                // Disable the web site notification
                const Notification = class {
                  constructor(title, options) {
                    this.title = title;
                    this.options = options;
                  }
      
                  // Override close function
                  close() {
                  }
      
                  // Override bind function
                  bind(notification) {
                  }
                }
      
                window.Notification = Notification;
              }
            }, 1000)
          }
          function initWeb3() {
            // Inject the web3 instance to web site
            const rskEndpoint = '${rskEndpoint}';
            const provider = new Web3.providers.HttpProvider(rskEndpoint);
            const web3Provider = new ethers.providers.Web3Provider(provider)
            const web3 = new Web3(provider);
            // When Dapp is "Money on Chain", webview uses Web3's Provider, others uses Ethers' Provider
            window.ethereum = '${dappName}' === 'Money on Chain' ? provider : web3Provider;
            window.ethereum.selectedAddress = '${address}';
            window.address = '${address}';
            window.ethereum.networkVersion = '${networkVersion}';
            window.ethereum.isRWallet = true;
            window.web3 = web3;
            // Adapt web3 old version (new web3 version move toDecimal and toBigNumber to utils class).
            window.web3.toDecimal = window.web3.utils.toDecimal;
            window.web3.toBigNumber = window.web3.utils.toBN;
            
            const config = {
              isEnabled: true,
              isUnlocked: true,
              networkVersion: '${networkVersion}',
              onboardingcomplete: true,
              selectedAddress: '${address}',
            }
            // Some web site using the config to check the window.ethereum is exist or not
            window.ethereum.publicConfigStore = {
              _state: {
                ...config,
              },
              getState: () => {
                return {
                  ...config,
                }
              }
            }
            window.web3.setProvider(window.ethereum);
            // Override enable function can return the current address to web site
            window.ethereum.enable = () => {
              return new Promise((resolve, reject) => {
                resolve(['${address}']);
              })
            }
            // Adapt web3 old version (new web3 version remove this function)
            window.web3.version = {
              api: '1.2.7',
              getNetwork: (cb) => { cb(null, '${networkVersion}') },
            }
            window.ethereum.on = (method, callback) => { if (method) {console.log(method)} }
            // Adapt web3 old version (need to override the abi's method).
            // web3 < 1.0 using const contract = web3.eth.contract(abi).at(address)
            // web3 >= 1.0 using const contract = new web3.eth.Contract()
            window.web3.eth.contract = (abi) => {
              const contract = new web3.eth.Contract(abi);
              contract.at = (address) => {
                contract.options.address = address;
                return contract;
              }
              const { _jsonInterface } = contract;
              _jsonInterface.forEach((item) => {
                if (item.name && item.stateMutability) {
                  const method = item.name;
                  if (item.stateMutability === 'pure' || item.stateMutability === 'view') {
                    contract[method] = (params, cb) => {
                      console.log('contract method: ', method);
                      contract.methods[method](params).call({ from: '${address}' }, cb);
                    };
                  } else {
                    contract[method] = (params, cb) => {
                      console.log('contract method: ', method);
                      contract.methods[method](params).send({ from: '${address}' }, cb);
                    };
                  }
                }
              });
              return contract;
            }
            // Override the sendAsync function so we can listen the web site's call and do our things
            const sendAsync = async (payload, callback) => {
              let err, res = '', result = '';
              const {method, params, jsonrpc, id} = payload;
              console.log('payload: ', payload);
              try {
                if (method === 'net_version') {
                  result = '${networkVersion}';
                } else if (method === 'eth_chainId') {
                  result = web3.utils.toHex(${networkVersion});
                } else if (method === 'eth_requestAccounts' || method === 'eth_accounts' || payload === 'eth_accounts') {
                  result = ['${address}'];
                } else {
                  result = await communicateWithRN(payload);
                }
                res = {id, jsonrpc, method, result};
              } catch(err) {
                err = err;
                console.log('sendAsync err: ', err);
              }
              
              console.log('res: ', res);
              if (callback) {
                callback(err, res);
              } else {
                return res || err;
              }
            }
            // ensure window.ethereum.send and window.ethereum.sendAsync are not undefined
            setTimeout(() => {
              if (!window.ethereum.send) {
                window.ethereum.send = sendAsync;
              }
              if (!window.ethereum.sendAsync) {
                window.ethereum.sendAsync = sendAsync;
              }
              if (!window.ethereum.request) {
                window.ethereum.request = (payload) =>
                  new Promise((resolve, reject) =>
                    sendAsync(payload).then(response =>
                      response.result
                        ? resolve(response.result)
                        : reject(new Error(response.message || 'provider error'))));
              }
            }, 1000)
          }
          initNotification();
          initWeb3();
        }) ();
      true
    `;
  };

  const injectJavaScript = address => {
    const jsCode = getJsCode(address);
    return jsCode;
  };

  const onMessage = async event => {
    const {data} = event.nativeEvent;
    const payload = JSON.parse(data);
    const {method, id} = payload;

    try {
      switch (method) {
        case 'eth_estimateGas': {
          await handleEthEstimateGas(payload);
          break;
        }
        case 'eth_gasPrice': {
          await handleEthGasPrice(payload);
          break;
        }
        case 'eth_call': {
          await handleEthCall(payload);
          break;
        }

        case 'eth_getBlockByNumber': {
          await handleEthGetBlockByNumber(payload);
          break;
        }

        case 'eth_blockNumber': {
          await handleEthGetBlockNumber(payload);
          break;
        }

        case 'eth_getTransactionReceipt': {
          await handleEthGetTransactionReceipt(payload);
          break;
        }

        case 'eth_getTransactionByHash': {
          await handleEthGetTransactionByHash(payload);
          break;
        }

        default:
          break;
      }
    } catch (err) {
      console.log('onMessage error: ', err);
    }
  };

  const handleEthEstimateGas = async payload => {
    const {params, id} = payload;
    const res = await this.web3.estimateGas(params[0]);
    const estimateGas = Number(res);
    const result = {id, result: estimateGas};
    postMessageToWebView(result);
  };

  const handleEthGasPrice = async payload => {
    const {id} = payload;
    const res = await this.web3.getGasPrice();
    const result = {id, result: res};
    postMessageToWebView(result);
  };

  const handleEthCall = async payload => {
    const {id, params} = payload;
    const res = await this.web3.call(params[0], params[1]);
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
    res = await this.web3.getBlock(blockNumber);
    const result = {id, result: res};
    postMessageToWebView(result);
  };

  const handleEthGetBlockNumber = async payload => {
    const {id} = payload;
    const res = await this.web3.getBlockNumber();
    const result = {id, result: res};
    postMessageToWebView(result);
  };

  const postMessageToWebView = result => {
    if (this.webview && this.webview.current) {
      this.webview.current.postMessage(JSON.stringify(result));
    }
  };

  const handlePersonalSign = async (id, message) => {
    const {callAuthVerify} = this.props;
    const {
      wallet: {coins},
    } = this.state;
    callAuthVerify(
      async () => {
        try {
          const {privateKey} = coins[0];
          const accountInfo = await this.web3.accounts.privateKeyToAccount(
            privateKey,
          );
          const signature = await accountInfo.sign(message, privateKey);
          const result = {id, result: signature.signature};
          this.postMessageToWebView(result);
        } catch (err) {
          console.log('personal_sign err: ', err);
          this.handleReject(id, err.message);
        }
      },
      () => {
        this.handleReject(id, 'Verify error');
      },
    );
  };

  const handleEthSendTransaction = async (id, txData) => {
    const {callAuthVerify} = this.props;
    const {
      wallet: {coins},
    } = this.state;
    callAuthVerify(
      async () => {
        try {
          const {privateKey} = coins[0];
          const accountInfo = await this.web3.accounts.privateKeyToAccount(
            privateKey,
          );
          const signedTransaction = await accountInfo.signTransaction(
            txData,
            privateKey,
          );
          const {rawTransaction} = signedTransaction;
          this.web3
            .sendSignedTransaction(rawTransaction)
            .on('transactionHash', hash => {
              const result = {id, result: hash};
              this.postMessageToWebView(result);
            })
            .on('error', error => {
              console.log('sendSignedTransaction error: ', error);
              this.handleReject(id, error.message);
            });
        } catch (err) {
          console.log('eth_sendTransaction err: ', err);
          this.handleReject(id, err.message);
        }
      },
      () => {
        this.handleReject(id, 'Verify error');
      },
    );
  };

  const handleEthGetTransactionReceipt = async payload => {
    const {id, params} = payload;
    let res = await this.web3.getTransactionReceipt(params[0]);
    if (!res) {
      res = '';
    } else {
      // RNS and tRif faucet's transaction status judge condition: parseInt(status, 16) === 1, so need set true to 1 and false to 0
      res.status = res.status ? 1 : 0;
    }
    const result = {id, result: res};
    this.postMessageToWebView(result);
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
    if (browserRef && canGoForward) {
      browserRef.current.goForward();
    }
  };

  // // go back to the last page
  const goBack = () => {
    if (browserRef && canGoBack) {
      browserRef.current.goBack();
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
          ref={browserRef}
          source={{uri: url}}
          onNavigationStateChange={onNavigationStateChange}
          onLoadStart={() => setLoader(true)}
          onLoadEnd={() => setLoader(false)}
          injectedJavaScriptBeforeContentLoaded={injectJavaScript(url)}
          onMessage={onMessage}
        />
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
