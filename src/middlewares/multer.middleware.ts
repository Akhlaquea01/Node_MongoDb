import multer from "multer";

const DEFAULT_DESTINATION = "./public/temp";

const getDefaultStorage = (destination) => {
  return multer.diskStorage({
    destination: destination || DEFAULT_DESTINATION,
    filename: function (req, file, cb) {
      const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
      cb(null, uniqueSuffix + '-' + file.originalname);
    }
  });
};

export const upload = (options:any = {}) => {
  const destination = options.destination || DEFAULT_DESTINATION;
  const fileFilter = options.fileFilter || defaultFileFilter;
  const limits = options.limits || getDefaultLimits();
  const storage = options.storage || getDefaultStorage(destination);

  return multer({
    storage: storage,
    limits: limits,
    fileFilter: fileFilter
  });
};

const getDefaultLimits = () => {
  return {
    fileSize: 1024 * 1024 *5// 1 MB limit for each file
  };
};

const defaultFileFilter = (req, file, cb) => {
  // Accept only certain file types
  if (file.mimetype === 'image/jpeg' || file.mimetype === 'image/png' || file.mimetype === 'video/mp4') {
    cb(null, true);
  } else {
    // Reject a file
    cb(new Error('Invalid file type. Only JPEG and PNG images are allowed.'), false);
  }
};
