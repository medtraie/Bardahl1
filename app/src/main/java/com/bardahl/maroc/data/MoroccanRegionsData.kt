package com.bardahl.maroc.data

import androidx.compose.ui.graphics.Color

data class MoroccanRegion(
    val id: String,
    val name: String,
    val colorHex: String,
    val cities: List<String>
) {
    val color: Color
        get() = try {
            Color(android.graphics.Color.parseColor(colorHex))
        } catch (e: Exception) {
            Color(0xFFFFD000)
        }
}

object MoroccanRegionsRepository {

    val DEFAULT_REGIONS = listOf(
        MoroccanRegion(
            id = "reg_beni_mellal",
            name = "Béni Mellal-Khénifra",
            colorHex = "#10B981",
            cities = listOf("Béni Mellal", "Khénifra", "Khouribga", "Fquih Ben Salah", "Azilal", "Kasba Tadla", "Oued Zem", "Souk Sebt")
        ),
        MoroccanRegion(
            id = "reg_casa_settat",
            name = "Casablanca-Settat",
            colorHex = "#FFD000",
            cities = listOf("Casablanca", "Mohammedia", "Settat", "Berrechid", "El Jadida", "Benslimane", "Nouaceur", "Médiouna", "Sidi Bennour", "Bouznika")
        ),
        MoroccanRegion(
            id = "reg_dakhla",
            name = "Dakhla-Oued Ed Dahab",
            colorHex = "#06B6D4",
            cities = listOf("Dakhla", "Aousserd")
        ),
        MoroccanRegion(
            id = "reg_draa_tafilalet",
            name = "Drâa-Tafilalet",
            colorHex = "#F97316",
            cities = listOf("Errachidia", "Ouarzazate", "Tinghir", "Midelt", "Zagora", "Erfoud", "Rissani")
        ),
        MoroccanRegion(
            id = "reg_fes_meknes",
            name = "Fès-Meknès",
            colorHex = "#F59E0B",
            cities = listOf("Fès", "Meknès", "Taza", "Sefrou", "Ifrane", "Moulay Yacoub", "Boulemane", "Taounate", "El Hajeb", "Azrou")
        ),
        MoroccanRegion(
            id = "reg_guelmim",
            name = "Guelmim-Oued Noun",
            colorHex = "#EC4899",
            cities = listOf("Guelmim", "Tan-Tan", "Sidi Ifni", "Assa-Zag")
        ),
        MoroccanRegion(
            id = "reg_oriental",
            name = "L’Oriental",
            colorHex = "#84CC16",
            cities = listOf("Oujda", "Nador", "Berkane", "Taourirt", "Jerada", "Driouch", "Guercif", "Figuig", "Saïdia")
        ),
        MoroccanRegion(
            id = "reg_laayoune",
            name = "Laâyoune-Sakia El Hamra",
            colorHex = "#6366F1",
            cities = listOf("Laâyoune", "Boujdour", "Tarfaya", "Es-Semara")
        ),
        MoroccanRegion(
            id = "reg_marrakech_safi",
            name = "Marrakech-Safi",
            colorHex = "#EF4444",
            cities = listOf("Marrakech", "Safi", "Essaouira", "El Kelâa des Sraghna", "Chichaoua", "Youssoufia", "Ben Guerir", "Rhamna")
        ),
        MoroccanRegion(
            id = "reg_tanger_tetouan",
            name = "Tanger-Tétouan-Al Hoceïma",
            colorHex = "#8B5CF6",
            cities = listOf("Tanger", "Tétouan", "Al Hoceïma", "Larache", "Ksar El Kébir", "Chefchaouen", "Asilah", "M'diq", "Fnideq", "Ouazzane")
        ),
        MoroccanRegion(
            id = "reg_souss_massa",
            name = "Souss-Massa",
            colorHex = "#14B8A6",
            cities = listOf("Agadir", "Inezgane", "Aït Melloul", "Taroudant", "Tiznit", "Chtouka Aït Baha", "Tata", "Biougra")
        ),
        MoroccanRegion(
            id = "reg_rabat_sale_kenitra",
            name = "Rabat-Salé-Kénitra",
            colorHex = "#3B82F6",
            cities = listOf("Rabat", "Salé", "Kénitra", "Témara", "Skhirat", "Khémisset", "Sidi Kacem", "Sidi Slimane", "Tiflet")
        )
    )

    private val customRegions = mutableListOf<MoroccanRegion>()

    fun getAllRegions(): List<MoroccanRegion> {
        return DEFAULT_REGIONS + customRegions
    }

    fun addCustomRegion(name: String, cities: List<String>, colorHex: String = "#EAB308"): MoroccanRegion {
        val cleanName = name.trim()
        val existing = getAllRegions().find { it.name.equals(cleanName, ignoreCase = true) }
        if (existing != null) {
            val mergedCities = (existing.cities + cities.map { it.trim() }.filter { it.isNotBlank() }).distinct()
            val updated = existing.copy(cities = mergedCities)
            customRegions.removeAll { it.name.equals(cleanName, ignoreCase = true) }
            customRegions.add(updated)
            return updated
        }
        val newReg = MoroccanRegion(
            id = "reg_custom_${System.currentTimeMillis()}",
            name = cleanName,
            colorHex = colorHex,
            cities = cities.map { it.trim() }.filter { it.isNotBlank() }
        )
        customRegions.add(newReg)
        return newReg
    }

    fun getRegionForCity(cityOrRegionName: String?): String {
        if (cityOrRegionName.isNullOrBlank()) return "Casablanca-Settat"
        val text = cityOrRegionName.trim().lowercase()

        // 1. Exact region match
        val matchReg = getAllRegions().find { it.name.trim().lowercase() == text }
        if (matchReg != null) return matchReg.name

        // 2. City match in regions
        for (reg in getAllRegions()) {
            for (city in reg.cities) {
                val cLower = city.trim().lowercase()
                if (text == cLower || text.contains(cLower) || cLower.contains(text)) {
                    return reg.name
                }
            }
        }

        // 3. Fallback Moroccan heuristics
        if (text.contains("casa") || text.contains("settat") || text.contains("mohammedia") || text.contains("berrechid") || text.contains("jadida")) {
            return "Casablanca-Settat"
        }
        if (text.contains("rabat") || text.contains("salé") || text.contains("sale") || text.contains("kénitra") || text.contains("kenitra") || text.contains("témara") || text.contains("temara")) {
            return "Rabat-Salé-Kénitra"
        }
        if (text.contains("tanger") || text.contains("tétouan") || text.contains("tetouan") || text.contains("larache") || text.contains("hoceima")) {
            return "Tanger-Tétouan-Al Hoceïma"
        }
        if (text.contains("marrakech") || text.contains("safi") || text.contains("essaouira")) {
            return "Marrakech-Safi"
        }
        if (text.contains("agadir") || text.contains("inezgane") || text.contains("taroudant") || text.contains("tiznit") || text.contains("souss")) {
            return "Souss-Massa"
        }
        if (text.contains("fès") || text.contains("fes") || text.contains("meknès") || text.contains("meknes") || text.contains("taza")) {
            return "Fès-Meknès"
        }
        if (text.contains("oujda") || text.contains("nador") || text.contains("berkane") || text.contains("oriental")) {
            return "L’Oriental"
        }
        if (text.contains("béni") || text.contains("beni") || text.contains("khénifra") || text.contains("khenifra") || text.contains("khouribga")) {
            return "Béni Mellal-Khénifra"
        }
        if (text.contains("dakhla") || text.contains("aousserd")) {
            return "Dakhla-Oued Ed Dahab"
        }
        if (text.contains("laâyoune") || text.contains("laayoune") || text.contains("boujdour") || text.contains("tarfaya") || text.contains("semara")) {
            return "Laâyoune-Sakia El Hamra"
        }
        if (text.contains("guelmim") || text.contains("tan-tan") || text.contains("tantan") || text.contains("ifni")) {
            return "Guelmim-Oued Noun"
        }
        if (text.contains("errachidia") || text.contains("ouarzazate") || text.contains("tinghir") || text.contains("zagora") || text.contains("midelt")) {
            return "Drâa-Tafilalet"
        }

        return "Casablanca-Settat"
    }

    fun getCitiesForRegions(regionNames: List<String>): List<String> {
        val result = mutableSetOf<String>()
        regionNames.forEach { rName ->
            val reg = getAllRegions().find { it.name.equals(rName.trim(), ignoreCase = true) }
            if (reg != null) {
                result.addAll(reg.cities)
            }
        }
        return result.toList()
    }
}
