import { View, Text } from 'react-native';

export default function HubScreen() {
  return (
    <View className="flex-1 bg-white dark:bg-slate-900 justify-center items-center">
      <Text className="text-2xl font-bold text-slate-900 dark:text-white">The Hub</Text>
      <Text className="text-base text-slate-500 dark:text-slate-400 mt-2">Civic Wins & Fails Feed</Text>
    </View>
  );
}
