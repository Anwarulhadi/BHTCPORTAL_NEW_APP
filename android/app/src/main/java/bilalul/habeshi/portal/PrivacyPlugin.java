package bilalul.habeshi.portal;

import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import android.view.WindowManager;

@CapacitorPlugin(name = "Privacy")
public class PrivacyPlugin extends Plugin {

    @PluginMethod
    public void enable(PluginCall call) {
        if (getActivity() != null) {
            getActivity().runOnUiThread(() -> {
                getActivity().getWindow().setFlags(WindowManager.LayoutParams.FLAG_SECURE, WindowManager.LayoutParams.FLAG_SECURE);
                call.resolve();
            });
        } else {
            call.reject("Activity is null");
        }
    }

    @PluginMethod
    public void disable(PluginCall call) {
        if (getActivity() != null) {
            getActivity().runOnUiThread(() -> {
                getActivity().getWindow().clearFlags(WindowManager.LayoutParams.FLAG_SECURE);
                call.resolve();
            });
        } else {
            call.reject("Activity is null");
        }
    }
}
