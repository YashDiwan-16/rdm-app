import { Colors } from '@/constants/Colors';
import { useRouter } from 'expo-router';
import React, { useEffect } from 'react';
import { Dimensions, StyleSheet, View } from 'react-native';
import Animated, {
    Easing,
    useAnimatedStyle,
    useSharedValue,
    withRepeat,
    withSequence,
    withTiming,
} from 'react-native-reanimated';
import { ThemedText } from './ThemedText';

const { width, height } = Dimensions.get('window');

const inspirationalQuotes = [
  "Small steps lead to big changes",
  "Progress, not perfection",
  "Your potential is endless",
  "Every goal achieved is growth gained",
  "Mindful moments create meaningful progress"
];

export function SplashScreen() {
  const fadeAnim = useSharedValue(0);
  const scaleAnim = useSharedValue(0.8);
  const floatAnim = useSharedValue(0);
  const router = useRouter();
  
  const randomQuote = inspirationalQuotes[Math.floor(Math.random() * inspirationalQuotes.length)];

  useEffect(() => {
    // Fade in animation
    fadeAnim.value = withTiming(1, {
      duration: 1500,
      easing: Easing.out(Easing.cubic),
    });

    // Scale animation
    scaleAnim.value = withTiming(1, {
      duration: 1200,
      easing: Easing.out(Easing.back(1.2)),
    });

    // Floating animation
    floatAnim.value = withRepeat(
      withSequence(
        withTiming(-10, { duration: 2000, easing: Easing.inOut(Easing.sin) }),
        withTiming(10, { duration: 2000, easing: Easing.inOut(Easing.sin) })
      ),
      -1,
      true
    );

    // Navigate to login after 3 seconds
    const timer = setTimeout(() => {
      router.replace('/login');
    }, 3000);

    return () => clearTimeout(timer);
  }, [fadeAnim, scaleAnim, floatAnim, router]);

  const fadeStyle = useAnimatedStyle(() => ({
    opacity: fadeAnim.value,
  }));

  const scaleStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scaleAnim.value }],
  }));

  const floatStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: floatAnim.value }],
  }));

  return (
    <View style={styles.container}>
      <View style={styles.background}>
        {/* Floating circles for ambient decoration */}
        <Animated.View style={[styles.circle, styles.circle1, floatStyle]} />
        <Animated.View style={[styles.circle, styles.circle2, floatStyle]} />
        <Animated.View style={[styles.circle, styles.circle3, floatStyle]} />
        
        {/* Main content */}
        <Animated.View style={[styles.content, fadeStyle]}>
          <Animated.View style={[styles.titleContainer, scaleStyle]}>
           
            <ThemedText style={styles.subtitle}>RDM Moodverse</ThemedText>
          </Animated.View>
          
          <Animated.View style={[styles.quoteContainer, fadeStyle]}>
            <ThemedText style={styles.quote}>&ldquo;{randomQuote}&rdquo;</ThemedText>
          </Animated.View>
        </Animated.View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  background: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: Colors.light.accent,
  },
  content: {
    alignItems: 'center',
    justifyContent: 'center',
    flex: 1,
  },
  titleContainer: {
    alignItems: 'center',
    marginBottom: 60,
  },
  title: {
    fontSize: 48,
    fontWeight: 'bold',
    color: '#FFFFFF',
    textAlign: 'center',
    letterSpacing: 2,
    textShadowColor: 'rgba(0, 0, 0, 0.3)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
  },
  subtitle: {
    fontSize: 24,
    fontWeight: '300',
    color: '#FFFFFF',
    textAlign: 'center',
    letterSpacing: 4,
    marginTop: 8,
    textShadowColor: 'rgba(0, 0, 0, 0.2)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  quoteContainer: {
    paddingHorizontal: 40,
    position: 'absolute',
    bottom: 120,
  },
  quote: {
    fontSize: 16,
    fontStyle: 'italic',
    color: '#FFFFFF',
    textAlign: 'center',
    lineHeight: 24,
    textShadowColor: 'rgba(0, 0, 0, 0.2)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  circle: {
    position: 'absolute',
    borderRadius: 50,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
  },
  circle1: {
    width: 100,
    height: 100,
    top: height * 0.15,
    left: width * 0.1,
  },
  circle2: {
    width: 60,
    height: 60,
    top: height * 0.3,
    right: width * 0.15,
  },
  circle3: {
    width: 80,
    height: 80,
    bottom: height * 0.25,
    left: width * 0.2,
  },
});
