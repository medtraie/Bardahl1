package com.bardahl.maroc.util

import android.annotation.SuppressLint
import android.content.Context
import android.os.Build
import android.provider.Settings
import java.net.NetworkInterface
import java.security.MessageDigest
import java.util.*

object DeviceSecurityUtil {

    data class DeviceInfo(
        val macAddress: String,
        val deviceModel: String,
        val manufacturer: String,
        val androidVersion: String,
        val androidId: String,
        val isEmulator: Boolean
    )

    @SuppressLint("HardwareIds")
    fun getDeviceInfo(context: Context?): DeviceInfo {
        val androidId = if (context != null) {
            try {
                Settings.Secure.getString(context.contentResolver, Settings.Secure.ANDROID_ID) ?: "UNKNOWN_ID"
            } catch (e: Exception) {
                "UNKNOWN_ID"
            }
        } else {
            "FALLBACK_SEED"
        }

        val mac = getDeviceMacAddress(androidId)
        val model = Build.MODEL ?: "Appareil Android"
        val manufacturer = Build.MANUFACTURER ?: "Android"
        val androidVersion = "Android ${Build.VERSION.RELEASE} (API ${Build.VERSION.SDK_INT})"
        val isEmulator = Build.FINGERPRINT.startsWith("generic") ||
                Build.MODEL.contains("google_sdk", ignoreCase = true) ||
                Build.HARDWARE.contains("goldfish", ignoreCase = true) ||
                Build.HARDWARE.contains("ranchu", ignoreCase = true)

        return DeviceInfo(
            macAddress = mac,
            deviceModel = "$manufacturer $model".trim(),
            manufacturer = manufacturer,
            androidVersion = androidVersion,
            androidId = androidId,
            isEmulator = isEmulator
        )
    }

    /**
     * Resolves the hardware or deterministic MAC address formatted as standard XX:XX:XX:XX:XX:XX
     */
    fun getDeviceMacAddress(context: Context?): String {
        val androidId = if (context != null) {
            try {
                Settings.Secure.getString(context.contentResolver, Settings.Secure.ANDROID_ID) ?: ""
            } catch (e: Exception) {
                ""
            }
        } else {
            ""
        }
        return getDeviceMacAddress(androidId)
    }

    /**
     * Resolves hardware MAC or derives deterministic MAC from androidId string
     */
    fun getDeviceMacAddress(androidId: String): String {
        try {
            val interfaces = Collections.list(NetworkInterface.getNetworkInterfaces())
            for (intf in interfaces) {
                if (intf.name.equals("wlan0", ignoreCase = true) || intf.name.equals("eth0", ignoreCase = true)) {
                    val macBytes = intf.hardwareAddress
                    if (macBytes != null && macBytes.isNotEmpty()) {
                        val sb = StringBuilder()
                        for (b in macBytes) {
                            sb.append(String.format("%02X:", b))
                        }
                        if (sb.isNotEmpty()) sb.deleteCharAt(sb.length - 1)
                        val macStr = sb.toString()
                        if (macStr != "02:00:00:00:00:00" && macStr.length == 17) {
                            return macStr.uppercase(Locale.US)
                        }
                    }
                }
            }
        } catch (e: Exception) {
            // Fallback to deterministic MAC
        }

        return computeDeterministicMac(androidId)
    }

    /**
     * Deterministically derives a standard 6-byte MAC address from Android ID
     * Stable across reboots and app launches on the same physical device.
     */
    fun computeDeterministicMac(seed: String): String {
        return try {
            val md = MessageDigest.getInstance("MD5")
            val effectiveSeed = seed.ifBlank { "${Build.MANUFACTURER}_${Build.MODEL}_${Build.SERIAL}_BARDAHL" }
            val hash = md.digest(effectiveSeed.toByteArray(Charsets.UTF_8))
            val sb = StringBuilder()
            for (i in 0 until 6) {
                val b = hash[i].toInt() and 0xFF
                // Set locally administered bit (bit 1 of first byte) to ensure valid unicast locally administered MAC
                val adjustedByte = if (i == 0) (b or 0x02) and 0xFE else b
                sb.append(String.format("%02X", adjustedByte))
                if (i < 5) sb.append(":")
            }
            sb.toString().uppercase(Locale.US)
        } catch (e: Exception) {
            "4E:8A:3C:91:2E:75"
        }
    }
}
