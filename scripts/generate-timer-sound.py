#!/usr/bin/env python3
"""
Script pour générer un son de cloche doux pour le Time Timer
TSA-friendly : son doux, apaisant, non agressif
"""

import wave
import struct
import math

def generate_bell_sound(filename, duration=1.0, frequency=800, sample_rate=44100):
    """
    Génère un fichier WAV avec un son de cloche doux

    Args:
        filename: Nom du fichier de sortie
        duration: Durée du son en secondes (défaut: 1.0)
        frequency: Fréquence en Hz (défaut: 800 - son de cloche)
        sample_rate: Taux d'échantillonnage (défaut: 44100)
    """
    # Ouvrir fichier WAV en mode écriture
    with wave.open(filename, 'w') as wav_file:
        # Configurer paramètres WAV (mono, 16 bits)
        n_channels = 1
        sample_width = 2  # 16 bits = 2 bytes

        wav_file.setnchannels(n_channels)
        wav_file.setsampwidth(sample_width)
        wav_file.setframerate(sample_rate)

        # Calculer nombre d'échantillons
        n_samples = int(duration * sample_rate)

        # Générer échantillons avec fade in/out (envelope ADSR simplifié)
        for i in range(n_samples):
            t = i / sample_rate

            # Enveloppe d'amplitude avec fade in/out doux
            # Fade in rapide (0.1s) puis decay exponentiel
            fade_in_duration = 0.1
            if t < fade_in_duration:
                # Fade in linéaire
                amplitude = 0.3 * (t / fade_in_duration)
            else:
                # Decay exponentiel (son de cloche qui s'éteint)
                decay_time = t - fade_in_duration
                amplitude = 0.3 * math.exp(-3 * decay_time / (duration - fade_in_duration))

            # Générer onde sinusoïdale
            sample = amplitude * math.sin(2 * math.pi * frequency * t)

            # Convertir en 16-bit signed integer
            sample_int = int(sample * 32767)

            # Écrire dans le fichier WAV
            wav_file.writeframes(struct.pack('<h', sample_int))

    print(f"✅ Fichier audio généré : {filename}")
    print(f"   - Durée : {duration}s")
    print(f"   - Fréquence : {frequency} Hz")
    print(f"   - Format : WAV 16-bit mono, {sample_rate} Hz")

if __name__ == "__main__":
    # Générer le son de cloche pour le Time Timer
    output_file = "public/sounds/timer-complete.wav"
    generate_bell_sound(
        filename=output_file,
        duration=1.0,      # 1 seconde
        frequency=800,     # 800 Hz (son de cloche doux)
        sample_rate=44100  # Qualité CD
    )
    print("🔔 Son de Time Timer généré avec succès!")
