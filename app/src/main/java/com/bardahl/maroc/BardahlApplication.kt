package com.bardahl.maroc

import android.app.Application
import android.os.Handler
import android.os.Looper
import android.util.Log

class BardahlApplication : Application() {
    override fun onCreate() {
        super.onCreate()
        
        // 1. Intercept all background thread exceptions to prevent any process termination
        Thread.setDefaultUncaughtExceptionHandler { thread, throwable ->
            Log.e("BardahlCrashDefensor", "Background exception in thread ${thread.name}: ${throwable.message}", throwable)
        }

        // 2. Intercept Main Looper exceptions (Cockroach pattern) to keep the UI running forever
        Handler(Looper.getMainLooper()).post {
            while (true) {
                try {
                    Looper.loop()
                } catch (t: Throwable) {
                    Log.e("BardahlCrashDefensor", "Caught Main Looper exception: ${t.message}", t)
                }
            }
        }
    }
}
