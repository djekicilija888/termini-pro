package com.terminipro.app;

import android.app.Activity;
import android.content.ContentResolver;
import android.content.ContentValues;
import android.content.Context;
import android.content.Intent;
import android.net.Uri;
import android.os.Build;
import android.os.Bundle;
import android.os.CancellationSignal;
import android.os.Environment;
import android.os.ParcelFileDescriptor;
import android.print.PageRange;
import android.print.PrintAttributes;
import android.print.PrintDocumentAdapter;
import android.print.PrintDocumentInfo;
import android.print.PrintManager;
import android.provider.MediaStore;
import android.util.Base64;
import android.view.WindowManager;
import android.webkit.JavascriptInterface;
import android.widget.Toast;

import androidx.core.content.FileProvider;

import com.getcapacitor.BridgeActivity;

import java.io.File;
import java.io.FileOutputStream;
import java.io.OutputStream;

public class MainActivity extends BridgeActivity {
    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        getWindow().setSoftInputMode(WindowManager.LayoutParams.SOFT_INPUT_ADJUST_RESIZE);
        try {
            if (this.bridge != null && this.bridge.getWebView() != null) {
                this.bridge.getWebView().addJavascriptInterface(new TerminiAndroidFiles(this), "TerminiAndroidFiles");
            }
        } catch (Exception ignored) {}
    }

    public static class TerminiAndroidFiles {
        private final Activity activity;

        TerminiAndroidFiles(Activity activity) {
            this.activity = activity;
        }

        private byte[] decode(String base64) throws Exception {
            String clean = base64 == null ? "" : base64.trim();
            int comma = clean.indexOf(',');
            if (comma >= 0) clean = clean.substring(comma + 1);
            return Base64.decode(clean, Base64.DEFAULT);
        }

        private String safeName(String name, String fallback) {
            String v = (name == null || name.trim().isEmpty()) ? fallback : name.trim();
            v = v.replaceAll("[\\\\/:*?\"<>|]+", "-");
            if (v.length() > 120) v = v.substring(0, 120);
            return v;
        }

        private String mimeOrDefault(String mimeType, String filename) {
            String m = mimeType == null ? "" : mimeType.trim();
            if (!m.isEmpty()) return m;
            String f = filename == null ? "" : filename.toLowerCase();
            if (f.endsWith(".pdf")) return "application/pdf";
            if (f.endsWith(".svg")) return "image/svg+xml";
            if (f.endsWith(".png")) return "image/png";
            return "application/octet-stream";
        }

        @JavascriptInterface
        public String saveBase64File(String base64, String filename, String mimeType) {
            try {
                byte[] data = decode(base64);
                String safe = safeName(filename, "termini-pro-fajl");
                String mime = mimeOrDefault(mimeType, safe);

                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
                    ContentResolver resolver = activity.getContentResolver();
                    ContentValues values = new ContentValues();
                    values.put(MediaStore.MediaColumns.DISPLAY_NAME, safe);
                    values.put(MediaStore.MediaColumns.MIME_TYPE, mime);
                    values.put(MediaStore.MediaColumns.RELATIVE_PATH, Environment.DIRECTORY_DOWNLOADS + "/TerminiPro");
                    values.put(MediaStore.MediaColumns.IS_PENDING, 1);

                    Uri uri = resolver.insert(MediaStore.Downloads.EXTERNAL_CONTENT_URI, values);
                    if (uri == null) throw new Exception("Ne mogu da napravim fajl.");
                    try (OutputStream out = resolver.openOutputStream(uri)) {
                        if (out == null) throw new Exception("Ne mogu da upišem fajl.");
                        out.write(data);
                    }
                    values.clear();
                    values.put(MediaStore.MediaColumns.IS_PENDING, 0);
                    resolver.update(uri, values, null, null);
                } else {
                    File dir = new File(Environment.getExternalStoragePublicDirectory(Environment.DIRECTORY_DOWNLOADS), "TerminiPro");
                    if (!dir.exists()) dir.mkdirs();
                    File file = new File(dir, safe);
                    try (FileOutputStream out = new FileOutputStream(file)) {
                        out.write(data);
                    }
                }

                activity.runOnUiThread(() -> Toast.makeText(activity, "Fajl je sačuvan u Downloads / TerminiPro", Toast.LENGTH_LONG).show());
                return "OK";
            } catch (Exception e) {
                activity.runOnUiThread(() -> Toast.makeText(activity, "Greška: " + e.getMessage(), Toast.LENGTH_LONG).show());
                return "ERR: " + e.getMessage();
            }
        }

        private File writeTemp(byte[] data, String filename) throws Exception {
            String safe = safeName(filename, "termini-pro-fajl");
            File dir = new File(activity.getCacheDir(), "termini_files");
            if (!dir.exists()) dir.mkdirs();
            File file = new File(dir, safe);
            try (FileOutputStream out = new FileOutputStream(file)) {
                out.write(data);
            }
            return file;
        }

        @JavascriptInterface
        public String openBase64File(String base64, String filename, String mimeType) {
            try {
                byte[] data = decode(base64);
                String safe = safeName(filename, "termini-pro-fajl");
                String mime = mimeOrDefault(mimeType, safe);
                File file = writeTemp(data, safe);
                Uri uri = FileProvider.getUriForFile(activity, activity.getPackageName() + ".fileprovider", file);

                Intent intent = new Intent(Intent.ACTION_VIEW);
                intent.setDataAndType(uri, mime);
                intent.addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION);
                Intent chooser = Intent.createChooser(intent, "Otvori fajl");
                chooser.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
                activity.startActivity(chooser);
                return "OK";
            } catch (Exception e) {
                activity.runOnUiThread(() -> Toast.makeText(activity, "Greška pri otvaranju: " + e.getMessage(), Toast.LENGTH_LONG).show());
                return "ERR: " + e.getMessage();
            }
        }

        @JavascriptInterface
        public String printBase64File(String base64, String filename, String mimeType) {
            try {
                byte[] data = decode(base64);
                String safe = safeName(filename, "termini-pro-fajl.pdf");
                String mime = mimeOrDefault(mimeType, safe);

                if (!mime.equals("application/pdf") && !safe.toLowerCase().endsWith(".pdf")) {
                    return openBase64File(base64, safe, mime);
                }

                activity.runOnUiThread(() -> {
                    try {
                        PrintManager printManager = (PrintManager) activity.getSystemService(Context.PRINT_SERVICE);
                        if (printManager == null) {
                            Toast.makeText(activity, "Štampa nije dostupna na ovom uređaju.", Toast.LENGTH_LONG).show();
                            return;
                        }
                        PrintAttributes attrs = new PrintAttributes.Builder()
                                .setMediaSize(PrintAttributes.MediaSize.ISO_A4)
                                .setColorMode(PrintAttributes.COLOR_MODE_COLOR)
                                .build();
                        printManager.print(safe, new PdfBytesPrintAdapter(data, safe), attrs);
                    } catch (Exception ex) {
                        Toast.makeText(activity, "Greška pri štampi: " + ex.getMessage(), Toast.LENGTH_LONG).show();
                    }
                });
                return "OK";
            } catch (Exception e) {
                activity.runOnUiThread(() -> Toast.makeText(activity, "Greška pri štampi: " + e.getMessage(), Toast.LENGTH_LONG).show());
                return "ERR: " + e.getMessage();
            }
        }
    }

    private static class PdfBytesPrintAdapter extends PrintDocumentAdapter {
        private final byte[] data;
        private final String filename;

        PdfBytesPrintAdapter(byte[] data, String filename) {
            this.data = data;
            this.filename = filename;
        }

        @Override
        public void onLayout(PrintAttributes oldAttributes, PrintAttributes newAttributes, CancellationSignal cancellationSignal, LayoutResultCallback callback, Bundle extras) {
            if (cancellationSignal.isCanceled()) {
                callback.onLayoutCancelled();
                return;
            }
            PrintDocumentInfo info = new PrintDocumentInfo.Builder(filename)
                    .setContentType(PrintDocumentInfo.CONTENT_TYPE_DOCUMENT)
                    .setPageCount(PrintDocumentInfo.PAGE_COUNT_UNKNOWN)
                    .build();
            callback.onLayoutFinished(info, true);
        }

        @Override
        public void onWrite(PageRange[] pages, ParcelFileDescriptor destination, CancellationSignal cancellationSignal, WriteResultCallback callback) {
            try (FileOutputStream out = new FileOutputStream(destination.getFileDescriptor())) {
                out.write(data);
                callback.onWriteFinished(new PageRange[]{PageRange.ALL_PAGES});
            } catch (Exception e) {
                callback.onWriteFailed(e.getMessage());
            }
        }
    }
}
