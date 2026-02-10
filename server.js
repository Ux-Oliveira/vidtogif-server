const express = require('express');
const multer = require('multer');
const ffmpeg = require('fluent-ffmpeg');
const fs = require('fs');
const cors = require('cors');

const app = express();
app.use(cors());
app.options('*', cors());

const upload = multer({ dest: 'uploads/' });

app.post('/convert', upload.single('video'), (req, res) => {
  const input = req.file.path;
  const palette = input + '_palette.png';
  const output = input + '.gif';

  ffmpeg.ffprobe(input, (err, data) => {
    const duration = data.format.duration;

    //time safe guard
    if (duration > 180) {
      fs.unlinkSync(input);
      return res.status(400).send('Video too long');
    }

    //only use first 10 seconds
    const clipLength = Math.min(10, duration);

    //GENERATING PALETTE
    ffmpeg(input)
      .inputOptions([
        '-ss 0',          //seeingk before decoding
        `-t ${clipLength}`
      ])
      .outputOptions([
        '-vf fps=10,scale=360:-1:flags=lanczos,palettegen'
      ])
      .save(palette)
      .on('end', () => {

      
        ffmpeg(input)
          .inputOptions([
            '-ss 0',
            `-t ${clipLength}`
          ])
          .input(palette)
          .complexFilter([
            'fps=10,scale=360:-1:flags=lanczos[x]',
            '[x][1:v]paletteuse'
          ])
          .toFormat('gif')
          .save(output)
          .on('end', () => {
            res.download(output, 'converted.gif', () => {
              fs.unlinkSync(input);
              fs.unlinkSync(output);
              fs.unlinkSync(palette);
            });
          });
      });
  });
});

app.listen(3000, () => console.log('FFmpeg server running on 3000'));
