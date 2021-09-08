import { StatusBar } from "expo-status-bar";
import React, { useState, useRef } from "react";
import { SafeAreaView, StyleSheet, Text, TextInput, View } from "react-native";
import { WebView } from "react-native-webview";

export default function App() {
  const [url, seturl] = useState("https://www.google.com");
  const [input, setInput] = useState("");
  const [canGoForward, setCanGoForward] = useState(false);
  const [canGoBack, setCanGoBack] = useState(false);
  const [title, setTitle] = useState("");
  const browserRef = useRef(null);
  const inputRef = useRef(null);

  // functions to search using different engines
  const searchEngines = {
    google: (uri) => `https://www.google.com/search?q=${uri}`,
    duckduckgo: (uri) => `https://duckduckgo.com/?q=${uri}`,
    bing: (uri) => `https://www.bing.com/search?q=${uri}`,
  };

  // upgrade the url to make it easier for the user:
  //
  // https://www.facebook.com => https://www.facebook.com
  // facebook.com => https://www.facebook.com
  // facebook => https://www.google.com/search?q=facebook
  function upgradeURL(uri, searchEngine = "google") {
    const isURL = uri.split(" ").length === 1 && uri.includes(".");
    console.warn(uri);
    if (isURL) {
      if (!uri.startsWith("http")) {
        seturl("https://www." + uri);
        return "https://www." + uri;
      }
      seturl(uri);
      return uri;
    }
    // search for the text in the search engine

    const encodedURI = encodeURI(uri);
    seturl(searchEngines[searchEngine](encodedURI));
    return searchEngines[searchEngine](encodedURI);
  }

  const onNavigationStateChange = (navState) => {
    const { canGoForward, canGoBack, title } = navState;
    setTitle(title);
    setCanGoBack(canGoBack);
    setCanGoForward(canGoForward);
  };

  // // go to the next page
  // const goForward = () => {
  //   if (browserRef && this.state.canGoForward) {
  //     browserRef.goForward();
  //   }
  // };

  // // go back to the last page
  // const goBack = () => {
  //   if (browserRef && this.state.canGoBack) {
  //     browserRef.goBack();
  //   }
  // };

  // // reload the page
  // const reload = () => {
  //   if (browserRef) {
  //     browserRef.reload();
  //   }
  // };
  console.warn("Url ", url);
  return (
    <View style={styles.container}>
      <SafeAreaView style={{ flex: 1 }}>
        <StatusBar style="auto" />
        <TextInput
          ref={inputRef}
          autoCapitalize="none"
          defaultValue={url}
          onSubmitEditing={() => upgradeURL(url)}
          returnKeyType="search"
          onChangeText={(val) => seturl(val)}
          clearButtonMode="while-editing"
          autoCorrect={false}
          style={[styles.addressBarTextInput]}
        />
        <WebView
          ref={browserRef}
          source={{ uri: url }}
          onNavigationStateChange={onNavigationStateChange}
        />
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
  },
  addressBarTextInput: {
    backgroundColor: "#fff",
    borderColor: "transparent",
    borderRadius: 3,
    borderWidth: 1,
    height: 24,
    paddingLeft: 10,
    fontSize: 14,
  },
});
