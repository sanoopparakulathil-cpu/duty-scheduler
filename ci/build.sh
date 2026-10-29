set -ex
node -v; java -version; echo "ANDROID_HOME=$ANDROID_HOME"
node tests/test.js | tail -3
mkdir -p www && cp index.html style.css app.js logic.js sites.js manifest.json sw.js icon-192.png icon-512.png www/
npm install
npx cap add android
npx cap sync android
mkdir -p ~/.android && cp ci/debug.keystore ~/.android/debug.keystore
cd android
chmod +x gradlew
./gradlew assembleDebug --no-daemon --stacktrace
cd ..
find android -name '*.apk'
cp "$(find android -name 'app-debug.apk' | head -1)" DutyScheduler.apk
ls -l DutyScheduler.apk
