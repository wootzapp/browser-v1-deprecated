package com.browserapp;

import com.facebook.react.ReactActivity;
import android.webkit.WebView;

public class MainActivity extends ReactActivity {

  /**
   * Returns the name of the main component registered from JavaScript. This is used to schedule
   * rendering of the component.
   */
  @Override
  protected String getMainComponentName() {
  WebView.setWebContentsDebuggingEnabled(true);
    return "browserApp";
  }

}
