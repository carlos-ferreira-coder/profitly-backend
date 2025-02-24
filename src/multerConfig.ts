import multer from 'multer'
import path from 'path'

export const storageUsersPhotos = multer.diskStorage({
  destination: (_req, _file, callback) => {
    callback(null, path.resolve('src/images/users'))
  },

  filename: (_req, file, callback) => {
    const time = new Date().getTime()

    callback(null, `${time}_${file.originalname}`)
  },
})
