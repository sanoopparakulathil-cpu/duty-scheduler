set -ex
node -v; java -version; echo "ANDROID_HOME=$ANDROID_HOME"
mkdir -p www && cp index.html manifest.json icon-192.png icon-512.png www/
npm install
cp node_modules/jszip/dist/jszip.min.js www/
npx cap add android
npx cap sync android
mkdir -p ~/.android && cp ci/debug.keystore ~/.android/debug.keystore
cd android
sed -i -E "s/versionCode [0-9]+/versionCode ${VCODE:-1}/" app/build.gradle
grep -n versionCode app/build.gradle
chmod +x gradlew
./gradlew assembleDebug --no-daemon --stacktrace
cd ..
find android -name '*.apk'
cp "$(find android -name 'app-debug.apk' | head -1)" DutyScheduler.apk
ls -l DutyScheduler.apk
