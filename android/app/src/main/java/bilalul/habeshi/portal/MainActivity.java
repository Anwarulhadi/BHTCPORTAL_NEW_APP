package bilalul.habeshi.portal;

import android.app.DownloadManager;
import android.content.Context;
import android.net.Uri;
import android.os.Bundle;
import android.os.Environment;
import android.webkit.CookieManager;
import android.webkit.DownloadListener;
import android.webkit.URLUtil;
import android.webkit.WebView;
import android.widget.Toast;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        registerPlugin(PrivacyPlugin.class);
        
        // Get the WebView instance from Capacitor Bridge
        WebView webView = this.getBridge().getWebView();
        
        // Enable debugging
        WebView.setWebContentsDebuggingEnabled(true);

        // Set Download Listener
        webView.setDownloadListener(new DownloadListener() {
            @Override
            public void onDownloadStart(String url, String userAgent, String contentDisposition, String mimetype, long contentLength) {
                // Ignore blob URLs as they are handled by the Capacitor Filesystem plugin in the JS layer
                if (url.startsWith("blob:")) {
                    return;
                }

                try {
                    DownloadManager.Request request = new DownloadManager.Request(Uri.parse(url));
                    
                    // Set the MIME type and User Agent
                    request.setMimeType(mimetype);
                    String cookies = CookieManager.getInstance().getCookie(url);
                    request.addRequestHeader("cookie", cookies);
                    request.addRequestHeader("User-Agent", userAgent);
                    
                    // Set Title and Description
                    request.setDescription("Downloading file...");
                    String filename = URLUtil.guessFileName(url, contentDisposition, mimetype);
                    request.setTitle(filename);
                    
                    // Allow scanning by MediaScanner
                    request.allowScanningByMediaScanner();
                    
                    // Show notification when downloading and when completed
                    request.setNotificationVisibility(DownloadManager.Request.VISIBILITY_VISIBLE_NOTIFY_COMPLETED);
                    
                    // Save to public Downloads directory
                    request.setDestinationInExternalPublicDir(Environment.DIRECTORY_DOWNLOADS, filename);
                    
                    // Get Download Service and enqueue the request
                    DownloadManager dm = (DownloadManager) getSystemService(Context.DOWNLOAD_SERVICE);
                    dm.enqueue(request);
                    
                    Toast.makeText(getApplicationContext(), "Downloading File...", Toast.LENGTH_LONG).show();
                } catch (Exception e) {
                    Toast.makeText(getApplicationContext(), "Download Failed: " + e.getMessage(), Toast.LENGTH_LONG).show();
                }
            }
        });
    }
}
