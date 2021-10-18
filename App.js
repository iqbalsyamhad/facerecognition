import React, { useEffect } from 'react';
import { ActivityIndicator, Alert, Button, Dimensions, Image, SafeAreaView, Text, View } from 'react-native';
import { RNCamera } from 'react-native-camera';
import ImageEditor from "@react-native-community/image-editor";
import base64ToArrayBuffer, { decode } from 'base64-arraybuffer';
import axios from 'axios';
import { base_instance_options, facelist_id } from './app/config/azure';
import ImageResizer from 'react-native-image-resizer';

const camera = React.createRef();
const scanningType = 'scanning';
const registerType = 'register';

const App = (props) => {
  const [loading, setLoading] = React.useState(false);
  const [savedfaces, setSavedfaces] = React.useState([]);
  const [showCamera, setShowCamera] = React.useState(false);
  const [actionType, setActionType] = React.useState(scanningType);
  const [facedetected, setFacedetected] = React.useState(false);
  const [facebox, setFacebox] = React.useState(<></>);
  const [imageuri, setImageuri] = React.useState(null);

  useEffect(() => {
    async function fetchData() {
      setLoading(true);
      const faceapi_instance = axios.create(base_instance_options);
      const facelistdata = await faceapi_instance.get(`/facelists/${facelist_id}`)
        .catch(function (error) {
          console.log(JSON.stringify(error));
          alert('Gagal mendapatkan data!');
        });
      console.log(JSON.stringify(facelistdata));
      if (facelistdata?.data?.persistedFaces) {
        setSavedfaces(facelistdata.data.persistedFaces);
      }
      setLoading(false);
    };
    fetchData();
  }, []);

  const facemarkDetected = (faces) => {
    // console.log(JSON.stringify(faces));
    _renderFaceBoxes(faces.faces);
    if (faces.faces.length > 0) setFacedetected(true);
    else setFacedetected(false);
  }

  const actionPress = (isScanning) => {
    if (isScanning) scanning();
    else register();
  }

  const scanning = async () => {
    if (camera.current) {
      const data = await camera.current.takePictureAsync({ quality: 1, base64: true });
      setImageuri(data.uri);
      const selfie_ab = decode(data.base64);

      setShowCamera(false);
      setLoading(true);

      const facedetect_instance_options = { ...base_instance_options };
      facedetect_instance_options.headers['Content-Type'] = 'application/octet-stream';
      const facedetect_instance = axios.create(facedetect_instance_options);

      const facedetect_res = await facedetect_instance.post(
        `/detect?returnFaceId=true&detectionModel=detection_02`,
        selfie_ab
      ).catch(function (error) {
        console.log(JSON.stringify(error));
      });

      console.log("face detect res: ", facedetect_res.data);

      if (facedetect_res.data.length) {
        const findsimilars_instance_options = { ...base_instance_options };
        findsimilars_instance_options.headers['Content-Type'] = 'application/json';
        const findsimilars_instance = axios.create(findsimilars_instance_options);
        const findsimilars_res = await findsimilars_instance.post(
          `/findsimilars`,
          {
            faceId: facedetect_res.data[0].faceId,
            faceListId: facelist_id,
            maxNumOfCandidatesReturned: 2,
            mode: 'matchPerson'
          }
        ).catch(function (error) {
          console.log(JSON.stringify(error));
        });

        console.log("find similars res: ", findsimilars_res.data);

        setLoading(false);

        if (findsimilars_res?.data?.length) {
          const percentage = Math.round(parseFloat(findsimilars_res.data[0].confidence) * 100);
          const userDataFound = savedfaces.find(i => i.persistedFaceId == findsimilars_res.data[0].persistedFaceId);
          Alert.alert(`Terdeteksi!`, `Anda ter-identifikasi sebagai ${userDataFound?.userData} dengan kemiripan ${percentage}%.`);
        } else {
          Alert.alert("Tidak diketahui", "Mungkin anda tidak terdaftar.");
        }

      } else {
        Alert.alert("error", "Cannot find any face. Please make sure there is sufficient light when taking a selfie");
      }
    }
  }

  const register = async () => {
    if (camera.current) {
      const imageCaptured = await camera.current.takePictureAsync({ quality: 100, base64: false });
      const imageResized = await ImageResizer.createResizedImage(imageCaptured.uri, 1080, 1080, 'JPEG', 100, 0);

      // console.log(JSON.stringify(imageResized));
      setImageuri(imageResized.uri);

      const response = await fetch(imageResized.uri);
      const imgBlob = await response.blob();

      console.log(JSON.stringify(imageResized));
      console.log(JSON.stringify(imgBlob));

      const instance_options = { ...base_instance_options };
      instance_options.headers['Content-Type'] = 'application/octet-stream';
      const instance = axios.create(instance_options);

      const apiresponse = await instance.post(
        `/facelists/${facelist_id}/persistedFaces?userData=${'iqbal'}`,
        imgBlob
      ).catch(function (error) {
        if (error.response) {
          console.log(JSON.stringify(error.response));
        } else {
          console.log(JSON.stringify(error));
        }
      });

      if (apiresponse) console.log(JSON.stringify(apiresponse));
    }
  }

  function _renderFaceBoxes(face_data) {
    let views = face_data.map(x => {

      let box = {
        position: 'absolute',
        top: x.bounds.origin.y,
        left: x.bounds.origin.x
      };

      let style = {
        width: x.bounds.size.width,
        height: x.bounds.size.height,
        borderWidth: 2,
        borderColor: '#fff',
      };

      let attr = {
        color: '#fff',
      };

      return (
        <View key={x.faceId} style={box}>
          <View style={style}></View>
          <Text style={attr}>Wajah</Text>
        </View>
      );
    });

    setFacebox(<View>{views}</View>);
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: 'white' }}>
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
        {showCamera ?
          <View style={{ flex: 1, width: Dimensions.get('window').width, backgroundColor: 'black' }}>
            <RNCamera
              ref={camera}
              style={{
                flex: 1,
                justifyContent: 'flex-end',
                alignItems: 'center',
              }}
              type={RNCamera.Constants.Type.front}
              flashMode={RNCamera.Constants.FlashMode.on}
              ratio={'4:4'}
              faceDetectionLandmarks={RNCamera.Constants.FaceDetection.Landmarks.all}
              faceDetectionClassifications={RNCamera.Constants.FaceDetection.Classifications.all}
              faceDetectionMode={RNCamera.Constants.FaceDetection.Mode.accurate}
              onFacesDetected={(faces) => facemarkDetected(faces)}
              captureAudio={false}
            />
            <View style={{ position: 'absolute', flex: 1, left: 0, right: 0, top: 0 }}>
              {facebox}
            </View>
            {facedetected &&
              <View style={{
                position: 'absolute',
                left: 20,
                right: 20,
                top: 20,
                alignItems: 'center',
                backgroundColor: 'white',
                padding: 20,
                borderRadius: 10
              }}>
                <Text style={{ fontSize: 16, fontWeight: 'bold', color: 'green' }}>Wajah Terdeteksi</Text>
              </View>
            }
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center' }}>
              <View style={{ flex: 1 }}>
                <Button color={'transparent'} onPress={() => setShowCamera(false)} title="Tutup" />
              </View>
              <View style={{ flex: 1 }}>
                {actionType == scanningType ?
                  <Button onPress={() => actionPress(true)} title="Proses" />
                  :
                  // <Button onPress={() => actionPress(false)} title="Daftar" />
                  <></>
                }
              </View>
            </View>
          </View>
          :
          <View style={{ alignItems: 'center' }}>
            <Text style={{ fontSize: 22, marginBottom: 10 }}>Face Recognition</Text>
            {/* {imageuri &&
              <Image source={{ uri: imageuri }} style={{ marginVertical: 20, width: 200, height: 200 }} resizeMode="contain" />
            } */}
            <View style={{ marginTop: 20 }}>
              {loading ?
                <ActivityIndicator size={'large'} />
                :
                <Button onPress={() => {
                  setActionType(scanningType);
                  setShowCamera(true);
                }} title="Deteksi Wajah" />
              }
            </View>
            {savedfaces.length > 0 &&
              <View style={{ marginTop: 20 }}>
                <Text style={{ marginTop: 5, fontWeight: 'bold' }}>Daftar wajah:</Text>
                {savedfaces.map(face =>
                  <Text key={Math.random()} style={{ marginVertical: 4 }}>- {face.userData}</Text>
                )}
              </View>
            }
            {/* <View style={{ marginVertical: 5 }}>
              <Button color={'grey'} onPress={() => setActionType(registerType)} title="Daftarkan Wajah" />
            </View> */}
          </View>
        }
      </View>
    </SafeAreaView>
  )
}

export default App