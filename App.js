import { StatusBar } from "expo-status-bar";
import React, { useState, useRef } from "react";
import {
  ActivityIndicator,
  SafeAreaView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { WebView } from "react-native-webview";
import { Ionicons } from "@expo/vector-icons";

export default function App() {
  const [url, seturl] = useState("https://www.google.com");
  const [input, setInput] = useState("");
  const [canGoForward, setCanGoForward] = useState(false);
  const [canGoBack, setCanGoBack] = useState(false);
  const [loader, setLoader] = useState(false);
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
    const { canGoForward, canGoBack, title, url } = navState;
    console.warn("title", url);
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

  // // reload the page
  // const reload = () => {
  //   if (browserRef) {
  //     browserRef.reload();
  //   }
  // };
  // console.warn("Url ", url);
  return (
    <View style={styles.container}>
      <SafeAreaView style={{ flex: 1 }}>
        <StatusBar style="auto" />
        <View style={{ flexDirection: "row", alignItems: "center" }}>
          <TouchableOpacity activeOpacity={0.7} onPress={goBack}>
            <Ionicons
              name="chevron-back"
              size={28}
              color={canGoBack ? "#000" : "#808080"}
            />
          </TouchableOpacity>
          <TouchableOpacity
            disabled={!canGoForward}
            activeOpacity={0.7}
            onPress={goForward}
          >
            <Ionicons
              name="chevron-forward"
              size={28}
              color={canGoForward ? "#000" : "#808080"}
            />
          </TouchableOpacity>
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
          {loader ? (
            <View style={{ paddingHorizontal: 20 }} activeOpacity={0.7}>
              <ActivityIndicator size="small" color="#000" />
            </View>
          ) : null}
        </View>
        <WebView
          ref={browserRef}
          source={{ uri: url }}
          onNavigationStateChange={onNavigationStateChange}
          onLoadStart={() => setLoader(true)}
          onLoadEnd={() => setLoader(false)}
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
    flex: 1,
    marginHorizontal: 10,
  },
});
